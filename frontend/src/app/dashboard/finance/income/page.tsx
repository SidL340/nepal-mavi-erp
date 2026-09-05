'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, resolveFinancialYear, getFiscalYearFromBS, formatDateInput } from '@/lib/nepali-date';
import {
  TrendingUp,
  Plus,
  Filter,
  Search,
  Building,
  Landmark,
  FileSpreadsheet,
  X,
  Calendar,
  Wallet,
  QrCode,
  CreditCard,
  Receipt,
  CheckCircle2,
  Users,
  Eye,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IncomePage() {
  const queryClient = useQueryClient();
  const [sourceLevel, setSourceLevel] = useState('');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ACTIVE');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);

  // Form State
  const [incomeFormYearId, setIncomeFormYearId] = useState<string>('');
  const [addReceivedDateBs, setAddReceivedDateBs] = useState<string>(todayBS());
  const [paymentMedium, setPaymentMedium] = useState('CASH');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedBankAcc, setSelectedBankAcc] = useState('');

  // Inline Income Head Modal State
  const [newHeadCode, setNewHeadCode] = useState('');
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');

  // Inline Party Modal State
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyNameNepali, setNewPartyNameNepali] = useState('');
  const [newPartyType, setNewPartyType] = useState('DONOR');
  const [customPartyType, setCustomPartyType] = useState('');
  const [newPartyPan, setNewPartyPan] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  // ── 1. QUERIES ──────────────────────────────────────────────────────────────
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Financial Years (साउन–असार)
  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });
  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];
  const autoResolvedFY = resolveFinancialYear(addReceivedDateBs, financialYearsData || []);

  // Resolve current filtered financial year ID
  const effectiveFYId = selectedYearFilter === 'ALL'
    ? ''
    : selectedYearFilter === 'ACTIVE'
    ? (activeFinancialYear?.id ? String(activeFinancialYear.id) : '')
    : selectedYearFilter;

  const { data: categoriesData } = useQuery({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const res = await api.get('/income/categories');
      return res.data?.data || [];
    },
  });

  const { data: headsData } = useQuery({
    queryKey: ['income-heads'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  const { data: partiesData } = useQuery({
    queryKey: ['parties-list-income'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts-income'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['income-entries', sourceLevel, selectedHeadFilter, selectedPartyFilter, searchQuery, effectiveFYId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceLevel) params.append('sourceLevel', sourceLevel);
      if (selectedHeadFilter) params.append('headId', selectedHeadFilter);
      if (selectedPartyFilter) params.append('partyId', selectedPartyFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (effectiveFYId) params.append('financialYearId', effectiveFYId);
      const res = await api.get(`/income/entries?${params.toString()}`);
      return res.data;
    },
  });

  const { data: feeCollectionsData } = useQuery({
    queryKey: ['fee-collections-sum'],
    queryFn: async () => {
      const res = await api.get('/income/fee-collections?limit=1');
      return res.data;
    },
  });

  // ── 2. MUTATIONS ────────────────────────────────────────────────────────────
  const createIncomeHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/heads', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Income Topic created!');
      queryClient.invalidateQueries({ queryKey: ['income-heads'] });
      setIsAddHeadModalOpen(false);
      setNewHeadCode('');
      setNewHeadName('');
      setNewHeadNameNepali('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create income topic.');
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/parties', payload);
      return res.data;
    },
    onSuccess: (res: any) => {
      toast.success('New Party/Donor saved!');
      queryClient.invalidateQueries({ queryKey: ['parties-list-income'] });
      if (res?.data?.id) setSelectedPartyId(res.data.id.toString());
      setIsAddPartyModalOpen(false);
      setNewPartyName('');
      setNewPartyNameNepali('');
      setNewPartyPan('');
      setNewPartyPhone('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create party.');
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/income/entries', {
        ...formData,
        academicYearId: activeYear?.id || 1,
        financialYearId: incomeFormYearId ? parseInt(incomeFormYearId) : (autoResolvedFY?.id || activeFinancialYear?.id),
        receivedDateAd: new Date().toISOString().slice(0, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income Entry recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record income entry.');
    },
  });

  // Edit & Delete Income State
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [editAcademicYearId, setEditAcademicYearId] = useState('');
  const [editHeadId, setEditHeadId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editReceivedDateBs, setEditReceivedDateBs] = useState('');
  const [editSourceLevel, setEditSourceLevel] = useState('Central');
  const [editSourceOrg, setEditSourceOrg] = useState('');
  const [editPartyId, setEditPartyId] = useState('');
  const [editDepositedInAccount, setEditDepositedInAccount] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editReceivedBy, setEditReceivedBy] = useState('');
  const [editPaymentMedium, setEditPaymentMedium] = useState('CASH');
  const [editChequeNo, setEditChequeNo] = useState('');
  const [editVoucherNo, setEditVoucherNo] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const updateIncomeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/income/entries/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income entry updated successfully! (आम्दानी प्रविष्टि अद्यावधिक भयो)');
      queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      setEditingIncome(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update income entry.')
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/income/entries/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income entry deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['income-entries'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete income entry.')
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
      if (partyObj) data.sourceOrg = partyObj.name;
    }

    if (paymentMedium === 'CASH') {
      data.bankAccountId = null;
      data.depositedInAccount = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
      data.chequeNo = null;
      data.chequeDateBs = null;
    } else if (selectedBankAcc) {
      const bankObj = bankAccountsData?.find((b: any) => b.id.toString() === selectedBankAcc);
      if (bankObj) {
        data.bankAccountId = bankObj.id;
        data.depositedInAccount = `${bankObj.bankName} (${bankObj.accountNo})`;
      }
    }

    addIncomeMutation.mutate(data);
  };

  const entries = entriesData?.data || [];
  const directIncomeTotal = entriesData?.totalAmount || 0;
  const studentFeesTotal = feeCollectionsData?.totalAmount || 0;
  const grandTotalIncome = directIncomeTotal + studentFeesTotal;

  const govGrants = entries
    .filter((e: any) => e.head?.category?.type === 'GOVERNMENT_BUDGET' || ['Central', 'Provincial', 'Local'].includes(e.sourceLevel))
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const ownSourceEntries = entries
    .filter((e: any) => e.head?.category?.type === 'OWN_SOURCE' || e.sourceLevel === 'District' || e.sourceLevel === 'Other')
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const totalSelfIncome = ownSourceEntries + studentFeesTotal;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Income & Government Budget (आम्दानी तथा बजेट)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            केन्द्र, प्रदेश, स्थानीय पालिका तथा विद्यालयको आफ्नै स्रोत (पोखरी, जग्गा, कोठा भाडा, विद्यार्थी शुल्क) आम्दानी
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddPartyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition"
          >
            <Users size={14} className="text-emerald-700" />
            <span>+ Add Party / Donor</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition"
          >
            <Plus size={14} />
            <span>Record Income (आम्दानी प्रविष्टि)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Total School Income ({selectedYearFilter === 'ALL' ? 'सबै आर्थिक वर्षहरू' : `आ.व. ${financialYearsData?.find((f: any) => f.id.toString() === effectiveFYId)?.year || activeFinancialYear?.year || '२०८३/८४'}`})
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">रू {grandTotalIncome.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">Government Grants + Student Fees + Own Source</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Government Grants (सरकारी अनुदान बजेट)</span>
          <p className="text-2xl font-black text-[#1e3a5f] mt-2 font-mono">
            रू {govGrants.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Salary, ICT, Building, Scholarship</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">School Self Income (विद्यालय आफ्नै स्रोत / शुल्क)</span>
          <p className="text-2xl font-black text-amber-600 mt-2 font-mono">
            रू {totalSelfIncome.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Student Fees (Rs. {studentFeesTotal.toLocaleString()}) + Rent/Lease (Rs. {ownSourceEntries.toLocaleString()})
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search income by source org, voucher, cheque no, received by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
            />
          </div>

          {/* Fiscal Year Filter */}
          <select
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            className="rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-bold text-emerald-950 shadow-2xs"
          >
            <option value="ACTIVE">चालु आ.व. ({activeFinancialYear?.year || '2083/84'})</option>
            <option value="ALL">सबै आर्थिक वर्षहरू (All Fiscal Years)</option>
            {financialYearsData?.map((fy: any) => (
              <option key={fy.id} value={fy.id.toString()}>
                आ.व. {fy.year} {fy.isActive ? '(चालु)' : ''}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            value={sourceLevel}
            onChange={(e) => setSourceLevel(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Source Levels (सबै निकाय)</option>
            <option value="Central">Central Govt (सङ्घीय)</option>
            <option value="Provincial">Provincial Govt (प्रदेश)</option>
            <option value="Local">Local Govt (स्थानीय)</option>
            <option value="District">District (जिल्ला)</option>
            <option value="Other">Own Source (आफ्नै)</option>
          </select>

          {/* Topic Filter with Code */}
          <select
            value={selectedHeadFilter}
            onChange={(e) => setSelectedHeadFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
          >
            <option value="">All Income Topics (सबै आम्दानी शीर्षक)</option>
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
            <option value="">All Parties/Donors (सबै आम्दानी स्रोत पक्ष)</option>
            {partiesData?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-gray-500 font-mono">
          Showing <b>{entries.length}</b> income records
        </span>
      </div>

      {/* Income Entries Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#1e3a5f] text-white uppercase text-[10.5px] tracking-wider font-extrabold">
            <tr>
              <th className="p-3.5">Date (BS)</th>
              <th className="p-3.5">Source Level</th>
              <th className="p-3.5">Income Head (Code & Topic)</th>
              <th className="p-3.5">Source Org / Party</th>
              <th className="p-3.5">Payment Method & Account</th>
              <th className="p-3.5 text-right">Amount (रू)</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading income entries...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">No income entries found for selected filter.</td></tr>
            ) : (
              entries.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-gray-900">
                    <div>{item.receivedDateBs}</div>
                    <span className="inline-block text-[10px] font-sans font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5">
                      आ.व. {item.financialYear?.year || getFiscalYearFromBS(item.receivedDateBs)}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#1e3a5f] border border-slate-200">
                      {item.sourceLevel || 'Central'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      {item.head?.code && (
                        <span className="rounded bg-emerald-100 text-emerald-900 px-1.5 py-0.5 text-[10px] font-black font-mono">
                          {item.head.code}
                        </span>
                      )}
                      <p className="font-bold text-gray-900">{item.head?.name}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-nepali mt-0.5">{item.head?.category?.name}</p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-emerald-800">{item.party?.name || item.sourceOrg || '—'}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Rec By: {item.receivedBy || 'School Office'}</p>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                        {item.paymentMedium || 'CASH'}
                      </span>
                      {item.chequeNo && (
                        <span className="font-mono text-[10px] font-bold text-purple-900">
                          Chk: {item.chequeNo}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate max-w-xs mt-0.5">
                      {item.depositedInAccount || 'School Main Account'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                    रू {item.amount?.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingIncome(item);
                          setEditAcademicYearId(item.academicYearId?.toString() || '');
                          setEditHeadId(item.headId?.toString() || '');
                          setEditAmount(item.amount?.toString() || '');
                          setEditReceivedDateBs(item.receivedDateBs || todayBS());
                          setEditSourceLevel(item.sourceLevel || 'Central');
                          setEditSourceOrg(item.sourceOrg || '');
                          setEditPartyId(item.partyId?.toString() || '');
                          setEditDepositedInAccount(item.depositedInAccount || 'School Main Account');
                          setEditReceivedBy(item.receivedBy || '');
                          setEditPaymentMedium(item.paymentMedium || 'CASH');
                          setEditChequeNo(item.chequeNo || '');
                          setEditVoucherNo(item.voucherNo || '');
                          setEditRemarks(item.remarks || '');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                        title="Edit Income Entry"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this income entry?')) {
                            deleteIncomeMutation.mutate(item.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                        title="Delete Income Entry"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Income Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <span>Record Income Entry (आम्दानी प्रविष्टि)</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">आर्थिक वर्ष (Fiscal Year) *</label>
                    {autoResolvedFY && (
                      <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        स्वतः: {autoResolvedFY.year}
                      </span>
                    )}
                  </div>
                  <select
                    value={incomeFormYearId || autoResolvedFY?.id || activeFinancialYear?.id || ''}
                    onChange={(e) => setIncomeFormYearId(e.target.value)}
                    className="erp-input font-bold text-[#1e3a5f]"
                    required
                  >
                    {financialYearsData?.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        आ.व. {y.year} {y.isActive ? '(चालु आ.व.)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Level *</label>
                  <select name="sourceLevel" className="erp-input font-bold" required>
                    <option value="Central">Central Govt (सङ्घीय सरकार)</option>
                    <option value="Provincial">Provincial Govt (प्रदेश सरकार)</option>
                    <option value="Local">Local Govt (स्थानीय पालिका)</option>
                    <option value="District">District / EDC (जिल्ला)</option>
                    <option value="Other">School Own Source (आफ्नै स्रोत)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Income Head / Topic *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddHeadModalOpen(true)}
                      className="text-[10px] font-extrabold text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Topic</span>
                    </button>
                  </div>
                  <select name="headId" className="erp-input font-bold" required>
                    <option value="">-- Select Income Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount in रू (आम्दानी रकम) *</label>
                  <input required name="amount" type="number" step="any" placeholder="e.g. 500000" className="erp-input font-mono font-bold text-emerald-700 text-sm" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received Date in BS *</label>
                  <input
                    required
                    name="receivedDateBs"
                    type="text"
                    value={addReceivedDateBs}
                    onChange={(e) => setAddReceivedDateBs(formatDateInput(e.target.value))}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Source Org / Party</label>
                    <button
                      type="button"
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="text-[10px] font-extrabold text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Party</span>
                    </button>
                  </div>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="">-- Select Saved Party / Donor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {!selectedPartyId && (
                    <input name="sourceOrg" type="text" placeholder="Or type organization name..." className="erp-input" />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMedium}
                    onChange={(e) => setPaymentMedium(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="BANK_TRANSFER">BANK TRANSFER (बैंक ट्रान्सफर)</option>
                    <option value="CHEQUE">CHEQUE (चेक)</option>
                    <option value="CASH">CASH (नगद)</option>
                    <option value="QR_CODE">QR CODE (क्युआर)</option>
                  </select>
                </div>
              </div>

              {(paymentMedium === 'CHEQUE' || paymentMedium === 'BANK_TRANSFER') && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">Cheque / Trans Ref No.</label>
                    <input name="chequeNo" type="text" placeholder="CHQ-123456" className="erp-input font-mono font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">Cheque Date (BS)</label>
                    <input name="chequeDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono font-bold" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Deposited In Account</label>
                  {paymentMedium === 'CASH' ? (
                    <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>💵</span>
                      <span>विद्यालय नगद खाता (School Cash / Petty Cash A/c)</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedBankAcc}
                        onChange={(e) => setSelectedBankAcc(e.target.value)}
                        className="erp-input font-bold mb-1"
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccountsData?.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountName} ({b.accountNo})</option>
                        ))}
                      </select>
                      {!selectedBankAcc && (
                        <input name="depositedInAccount" type="text" defaultValue="Rastriya Banijya Bank Current A/C" className="erp-input" />
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received By / Voucher No</label>
                  <input name="receivedBy" type="text" placeholder="Accountant / Headmaster" className="erp-input" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" rows={2} placeholder="Any extra notes..." className="erp-input" />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={addIncomeMutation.isPending} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs">
                  {addIncomeMutation.isPending ? 'Saving...' : 'Save Income Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Income Topic Modal */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">Add New Income Topic (नयाँ आम्दानी शीर्षक)</h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createIncomeHeadMutation.mutate({
                categoryId: categoriesData?.[0]?.id || 1,
                code: newHeadCode.trim() || undefined,
                name: newHeadName,
                nameNepali: newHeadNameNepali,
              });
            }} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Accounting Code (कोड न.)</label>
                <input type="text" placeholder="e.g. 10101, 10201" value={newHeadCode} onChange={(e) => setNewHeadCode(e.target.value)} className="erp-input font-mono font-bold" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Income Topic Name (English) *</label>
                <input type="text" required placeholder="e.g. ICT Lab Grant, Scholarship" value={newHeadName} onChange={(e) => setNewHeadName(e.target.value)} className="erp-input font-bold" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Title (नेपाली शीर्षक)</label>
                <input type="text" placeholder="आइटी ल्याब अनुदान" value={newHeadNameNepali} onChange={(e) => setNewHeadNameNepali(e.target.value)} className="erp-input font-nepali font-bold" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createIncomeHeadMutation.isPending} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs">
                  {createIncomeHeadMutation.isPending ? 'Saving...' : 'Save Income Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Party Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">Add Party / Donor (आम्दानी स्रोत पक्ष)</h3>
              <button onClick={() => setIsAddPartyModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const finalPartyType = newPartyType === 'CUSTOM' ? customPartyType : newPartyType;
              createPartyMutation.mutate({
                name: newPartyName,
                nameNepali: newPartyNameNepali,
                partyType: finalPartyType || 'DONOR',
                panNo: newPartyPan,
                phone: newPartyPhone,
              });
            }} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Organization / Donor Name *</label>
                <input type="text" required placeholder="Bishrampur Local Municipality / EDC / Donor Name" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} className="erp-input font-bold" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name</label>
                <input type="text" placeholder="विश्रामपुर गाउँपालिका / राम कुमार" value={newPartyNameNepali} onChange={(e) => setNewPartyNameNepali(e.target.value)} className="erp-input font-nepali font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party Type (प्रकार)</label>
                  <select value={newPartyType} onChange={(e) => setNewPartyType(e.target.value)} className="erp-input font-bold">
                    <option value="DONOR">DONOR (चन्दादाता / दानवीर)</option>
                    <option value="GOVT">GOVT (सरकारी निकाय / पालिका)</option>
                    <option value="WORKER">WORKER (श्रमिक / कामदार / इलेक्ट्रिसियन / प्लम्बर)</option>
                    <option value="SHOPKEEPER">SHOPKEEPER (पसले / खाद्यान्न / किराना / स्टेसनरी)</option>
                    <option value="SERVICE_PROVIDER">SERVICE PROVIDER (सेवा प्रदायक - बिजुली / इन्टरनेट)</option>
                    <option value="VENDOR">VENDOR (विक्रेता / पसल)</option>
                    <option value="SUPPLIER">SUPPLIER (सामग्री सप्लायर)</option>
                    <option value="CONTRACTOR">CONTRACTOR (ठेकेदार / निर्माण कार्य)</option>
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
                  <label className="block font-bold text-gray-700 mb-1">PAN / Phone</label>
                  <input type="text" placeholder="Phone or PAN No." value={newPartyPhone} onChange={(e) => setNewPartyPhone(e.target.value)} className="erp-input font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddPartyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createPartyMutation.isPending} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs">
                  {createPartyMutation.isPending ? 'Saving...' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Income Entry Modal */}
      {editingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Edit2 size={18} className="text-emerald-600" />
                <span>Edit Income Entry (आम्दानी सम्पादन)</span>
              </h3>
              <button onClick={() => setEditingIncome(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateIncomeMutation.mutate({
                  id: editingIncome.id,
                  data: {
                    academicYearId: editAcademicYearId ? parseInt(editAcademicYearId) : undefined,
                    headId: parseInt(editHeadId),
                    amount: parseFloat(editAmount),
                    receivedDateBs: editReceivedDateBs,
                    sourceLevel: editSourceLevel,
                    sourceOrg: editSourceOrg || null,
                    partyId: editPartyId ? parseInt(editPartyId) : null,
                    depositedInAccount: editDepositedInAccount || 'School Main Account',
                    bankAccountId: editBankAccountId ? parseInt(editBankAccountId) : null,
                    receivedBy: editReceivedBy || null,
                    paymentMedium: editPaymentMedium || 'CASH',
                    chequeNo: editChequeNo || null,
                    voucherNo: editVoucherNo || null,
                    remarks: editRemarks || null,
                  }
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">आर्थिक वर्ष (Fiscal Year) *</label>
                  <select
                    value={editAcademicYearId}
                    onChange={(e) => setEditAcademicYearId(e.target.value)}
                    className="erp-input font-bold text-[#1e3a5f]"
                    required
                  >
                    {yearsData?.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        आ.व. {y.year} {y.isActive ? '(चालु आ.व.)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Level *</label>
                  <select
                    value={editSourceLevel}
                    onChange={(e) => setEditSourceLevel(e.target.value)}
                    className="erp-input font-bold"
                    required
                  >
                    <option value="Central">Central Govt (सङ्घीय सरकार)</option>
                    <option value="Provincial">Provincial Govt (प्रदेश सरकार)</option>
                    <option value="Local">Local Govt (स्थानीय पालिका)</option>
                    <option value="District">District / EDC (जिल्ला)</option>
                    <option value="Other">School Own Source (आफ्नै स्रोत)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Income Head / Topic *</label>
                  <select
                    value={editHeadId}
                    onChange={(e) => setEditHeadId(e.target.value)}
                    className="erp-input font-bold"
                    required
                  >
                    <option value="">-- Select Income Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (रकम रू) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="erp-input font-mono font-bold text-emerald-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received Date (BS) *</label>
                  <input
                    type="text"
                    required
                    value={editReceivedDateBs}
                    onChange={(e) => setEditReceivedDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Org / Party Name</label>
                  <input
                    type="text"
                    value={editSourceOrg}
                    onChange={(e) => setEditSourceOrg(e.target.value)}
                    placeholder="e.g. Bishrampur Municipality / Donor Name"
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Registered Party Link</label>
                  <select
                    value={editPartyId}
                    onChange={(e) => setEditPartyId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Registered Party (Optional) --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={editPaymentMedium}
                    onChange={(e) => setEditPaymentMedium(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="CASH">CASH (नगद)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (बैंक ट्रान्सफर)</option>
                    <option value="CHEQUE">CHEQUE (चेक)</option>
                    <option value="ONLINE">ONLINE / DIGITAL (डिजिटल)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cheque No. (Optional)</label>
                  <input
                    type="text"
                    value={editChequeNo}
                    onChange={(e) => setEditChequeNo(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Deposited In Account</label>
                  <input
                    type="text"
                    value={editDepositedInAccount}
                    onChange={(e) => setEditDepositedInAccount(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Received By / Voucher No</label>
                  <input
                    type="text"
                    value={editReceivedBy}
                    onChange={(e) => setEditReceivedBy(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setEditingIncome(null)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={updateIncomeMutation.isPending} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs">
                  {updateIncomeMutation.isPending ? 'Updating...' : 'Update Income Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
