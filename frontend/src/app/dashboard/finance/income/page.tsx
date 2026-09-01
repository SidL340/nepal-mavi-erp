'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
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
  DollarSign,
  QrCode,
  CreditCard,
  Receipt,
  CheckCircle2,
  Users,
  Eye,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IncomePage() {
  const queryClient = useQueryClient();
  const [sourceLevel, setSourceLevel] = useState('');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);

  // Form State
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
  const [newPartyType, setNewPartyType] = useState('GOVT');
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
    queryKey: ['income-entries', sourceLevel, selectedHeadFilter, selectedPartyFilter, searchQuery, activeYear?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceLevel) params.append('sourceLevel', sourceLevel);
      if (selectedHeadFilter) params.append('headId', selectedHeadFilter);
      if (selectedPartyFilter) params.append('partyId', selectedPartyFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (activeYear?.id) params.append('academicYearId', activeYear.id.toString());
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
        receivedDateAd: new Date().toISOString().slice(0, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Income entry recorded successfully!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['income-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save income');
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
      if (partyObj) data.sourceOrg = partyObj.name;
    }

    if (selectedBankAcc) {
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
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total School Income (Year {activeYear?.year || '2081-82'})</span>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading income entries...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No income entries found for selected filter.</td></tr>
            ) : (
              entries.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-gray-900">{item.receivedDateBs}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Income Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-xs">
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
              <div className="grid grid-cols-2 gap-3">
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
                  <input required name="receivedDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono font-bold" />
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
                  <label className="block font-bold text-gray-700 mb-1">Deposited In School Bank A/C</label>
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
              createPartyMutation.mutate({
                name: newPartyName,
                nameNepali: newPartyNameNepali,
                partyType: newPartyType,
                panNo: newPartyPan,
                phone: newPartyPhone,
              });
            }} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Organization / Donor Name *</label>
                <input type="text" required placeholder="Bishrampur Local Municipality / EDC" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} className="erp-input font-bold" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name</label>
                <input type="text" placeholder="विश्रामपुर गाउँपालिका" value={newPartyNameNepali} onChange={(e) => setNewPartyNameNepali(e.target.value)} className="erp-input font-nepali font-bold" />
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
    </div>
  );
}
