'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
  Receipt,
  FileText,
  Users,
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

import ExpensesPage from './expenses/page';
import IncomePage from './income/page';
import JournalPage from './journal/page';
import FeeCollectionPage from './fees/page';
import PayrollPage from './payroll/page';

export default function UnifiedFinanceHubPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const queryClient = useQueryClient();

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);

  // Modals for Parties & Bank Accounts
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [inspectPartyId, setInspectPartyId] = useState<number | null>(null);

  // Form states for Party
  const [partyName, setPartyName] = useState('');
  const [partyNameNepali, setPartyNameNepali] = useState('');
  const [partyType, setPartyType] = useState('VENDOR');
  const [customPartyType, setCustomPartyType] = useState('');
  const [partyPan, setPartyPan] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyAddress, setPartyAddress] = useState('');

  // Form states for Bank Account
  const [accountName, setAccountName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountType, setAccountType] = useState('Current');

  // ── 1. QUERIES ──────────────────────────────────────────────────────────────
  const { data: summaryData } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      const res = await api.get('/expense/summary');
      return res.data?.data;
    },
  });

  const { data: partiesData, isLoading: isPartiesLoading } = useQuery({
    queryKey: ['parties-list-all'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  const { data: bankAccountsData, isLoading: isBanksLoading } = useQuery({
    queryKey: ['bank-accounts-all'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  const { data: partyVouchersData } = useQuery({
    queryKey: ['party-vouchers-inspect', inspectPartyId],
    queryFn: async () => {
      if (!inspectPartyId) return null;
      const res = await api.get(`/parties/${inspectPartyId}/vouchers`);
      return res.data?.data;
    },
    enabled: !!inspectPartyId,
  });

  // ── 2. MUTATIONS ────────────────────────────────────────────────────────────
  const createPartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/parties', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Party / Recipient registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['parties-list-all'] });
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      setIsPartyModalOpen(false);
      setPartyName('');
      setPartyNameNepali('');
      setPartyPan('');
      setPartyPhone('');
      setPartyAddress('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save party.');
    },
  });

  const createBankMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/school/bank-accounts', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('School Bank Account registered!');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setIsBankModalOpen(false);
      setAccountName('');
      setAccountNo('');
      setBankName('');
      setBranch('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save bank account.');
    },
  });

  const totalIncome = summaryData?.totalIncome || 0;
  const totalExpense = summaryData?.totalExpense || 0;
  const netBalance = summaryData?.balance || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ─── PORTAL HEADER & kpis ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a4d7d] to-[#1e3a5f] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-amber-400" />
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                Financial Portal Hub (एकीकृत वित्तीय हब)
              </h1>
            </div>
            <p className="text-xs text-slate-200 font-nepali mt-1">
              नेपाल सरकार दोहोरो लेखा प्रणाली, आम्दानी, खर्च, गोश्वारा भौचर, पाउने व्यक्ति/संस्था (Parties) र बैंक खाता व्यवस्थापन
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPartyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 backdrop-blur-xs transition border border-white/15"
            >
              <Users size={14} />
              <span>+ Register Party (पाउने पक्ष)</span>
            </button>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-[#1e3a5f] hover:bg-amber-400 transition shadow-2xs"
            >
              <CreditCard size={14} />
              <span>+ Add Bank A/C (बैंक खाता)</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mt-6">
          <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase">
              <span>Total Income (आम्दानी)</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-emerald-300 font-mono mt-1">
              रू {totalIncome.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase">
              <span>Total Expenses (खर्च)</span>
              <ArrowUpRight className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-xl font-black text-rose-300 font-mono mt-1">
              रू {totalExpense.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase">
              <span>Net Fund Balance (मौज्दात)</span>
              <Wallet className="h-4 w-4 text-amber-400" />
            </div>
            <p className={`text-xl font-black font-mono mt-1 ${netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              रू {netBalance.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase">
              <span>Bank Accounts / Parties</span>
              <Building2 className="h-4 w-4 text-blue-300" />
            </div>
            <p className="text-xl font-black text-white font-mono mt-1">
              {bankAccountsData?.length || 0} A/C • {partiesData?.length || 0} Parties
            </p>
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'overview'
              ? 'bg-[#1e3a5f] text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <Building2 size={14} />
          <span>Financial Overview (अवलोकन)</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'expenses'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <TrendingDown size={14} />
          <span>Expenses (खर्च व्यवस्थापन)</span>
        </button>

        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'income'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={14} />
          <span>Income & Budget (आम्दानी)</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'fees'
              ? 'bg-indigo-700 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <Receipt size={14} />
          <span>Fee Collections (विद्यार्थी शुल्क)</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'payroll'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <Wallet size={14} />
          <span>Staff Payroll (तलबी भरपाई)</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'journal'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={14} />
          <span>Journal Vouchers (गोश्वारा भौचर)</span>
        </button>

        <button
          onClick={() => setActiveTab('parties')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'parties'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <Users size={14} />
          <span>Parties / Recipients (पाउने पक्ष)</span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
            activeTab === 'banks'
              ? 'bg-blue-700 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard size={14} />
          <span>Bank Accounts (बैंक खाताहरू)</span>
        </button>
      </div>

      {/* ─── TAB CONTENT ───────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && <ExpensesPage />}
      {activeTab === 'income' && <IncomePage />}
      {activeTab === 'fees' && <FeeCollectionPage />}
      {activeTab === 'payroll' && <PayrollPage />}
      {activeTab === 'journal' && <JournalPage />}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
              <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Layers size={18} className="text-amber-500" />
                <span>Financial Management Quick Actions</span>
              </h2>
              <p className="text-xs text-gray-500 font-nepali">
                आम्दानी, खर्च प्रविष्टि, भौचर जनरेसन तथा लेजर हेर्ने द्रुत बटनहरू
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('expenses')}
                  className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/50 text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-rose-700 font-bold text-xs">
                    <span>Record Expense</span>
                    <TrendingDown size={16} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-nepali">खर्च, तलब तथा बिल प्रविष्टि</p>
                </button>

                <button
                  onClick={() => setActiveTab('income')}
                  className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/50 text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-emerald-800 font-bold text-xs">
                    <span>Add Income / Grant</span>
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-nepali">बजेट तथा अनुदान आम्दानी</p>
                </button>

                <button
                  onClick={() => setActiveTab('parties')}
                  className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/50 text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-amber-800 font-bold text-xs">
                    <span>Parties / Vendors</span>
                    <Users size={16} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-nepali">पाउने व्यक्ति/संस्था खाता</p>
                </button>

                <button
                  onClick={() => setActiveTab('journal')}
                  className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-100/50 text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-purple-800 font-bold text-xs">
                    <span>Journal Ledger</span>
                    <FileText size={16} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-nepali">गोश्वारा भौचर तथा खाता पाना</p>
                </button>
              </div>
            </div>

            {/* School Bank Accounts Preview */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-600" />
                  <span>Active School Bank Accounts (बैंक खाताहरू)</span>
                </h2>
                <button
                  onClick={() => setIsBankModalOpen(true)}
                  className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Bank A/C</span>
                </button>
              </div>

              <div className="space-y-3">
                {bankAccountsData?.map((bank: any) => (
                  <div key={bank.id} className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-xs text-[#1e3a5f]">{bank.bankName}</p>
                      <p className="text-[11px] text-gray-600 font-medium mt-0.5">{bank.accountName}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">Branch: {bank.branch || 'Head Office'}</p>
                    </div>
                    <span className="font-mono text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {bank.accountNo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTIES TAB */}
      {activeTab === 'parties' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#1e3a5f]">Parties & Recipients Directory (पाउने व्यक्ति/संस्था सूचि)</h2>
              <p className="text-xs text-gray-500 font-nepali">विद्यालयबाट पटक-पटक भुक्तानी वा आम्दानी प्राप्त हुने vendor, सप्लायर, शिक्षक तथा सरकारी निकायहरू</p>
            </div>
            <button
              onClick={() => setIsPartyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-2xs"
            >
              <Plus size={14} />
              <span>Register New Party (पाउने पक्ष थप्नुहोस्)</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#1e3a5f] text-white uppercase text-[10.5px] tracking-wider font-extrabold">
                <tr>
                  <th className="py-3 px-4">Party / Vendor Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">PAN / VAT No.</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Total Vouchers</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {isPartiesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">Loading parties...</td>
                  </tr>
                ) : partiesData?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No parties registered yet.</td>
                  </tr>
                ) : (
                  partiesData?.map((party: any) => (
                    <tr key={party.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {party.name}
                        {party.nameNepali && <span className="text-gray-500 font-nepali text-[11px] block">{party.nameNepali}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                          {party.partyType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">{party.panNo || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono">{party.phone || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold">
                        {(party._count?.expenseEntries || 0) + (party._count?.incomeEntries || 0)} vouchers
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInspectPartyId(party.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-[#1e3a5f] hover:bg-slate-50"
                        >
                          <Eye size={12} />
                          <span>Party Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BANK ACCOUNTS TAB */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#1e3a5f]">School Bank Accounts (विद्यालय बैंक खाताहरू)</h2>
              <p className="text-xs text-gray-500 font-nepali">सरकारी निकासा, आन्तरिक आय तथा धरौटी खाताहरू</p>
            </div>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 shadow-2xs"
            >
              <Plus size={14} />
              <span>Add Bank Account (नयाँ खाता)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bankAccountsData?.map((b: any) => (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {b.type || 'Current Account'}
                  </span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <h3 className="font-extrabold text-sm text-[#1e3a5f]">{b.bankName}</h3>
                <p className="text-xs text-gray-700 font-bold">{b.accountName}</p>
                <p className="text-xs font-mono font-black text-rose-700 bg-slate-50 p-2 rounded-lg border border-slate-200 tracking-wider">
                  {b.accountNo}
                </p>
                <p className="text-[11px] text-gray-400">Branch: {b.branch || 'Head Office'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── REGISTER PARTY MODAL ────────────────────────────────────────────── */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Users size={16} />
                <span>Register Recipient / Party (पाउने पक्ष)</span>
              </h3>
              <button onClick={() => setIsPartyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalPartyType = partyType === 'CUSTOM' ? customPartyType : partyType;
                createPartyMutation.mutate({
                  name: partyName,
                  nameNepali: partyNameNepali,
                  partyType: finalPartyType || 'VENDOR',
                  panNo: partyPan,
                  phone: partyPhone,
                  address: partyAddress,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Party / Vendor Name (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Stationers / Electrician Ram Kumar / Groceries Shop"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name (नेपाली नाम)</label>
                <input
                  type="text"
                  placeholder="क्वालिटी स्टेसनरी / राम इलेक्ट्रिसियन"
                  value={partyNameNepali}
                  onChange={(e) => setPartyNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party Type (प्रकार)</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value)}
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
                  {partyType === 'CUSTOM' && (
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
                    value={partyPan}
                    onChange={(e) => setPartyPan(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  className="erp-input font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bishrampur, Rautahat"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsPartyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createPartyMutation.isPending} className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-xs">
                  {createPartyMutation.isPending ? 'Saving...' : 'Save Party (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD BANK ACCOUNT MODAL ─────────────────────────────────────────── */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <CreditCard size={16} />
                <span>Add School Bank Account (नयाँ बैंक खाता)</span>
              </h3>
              <button onClick={() => setIsBankModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBankMutation.mutate({
                  accountName,
                  accountNo,
                  bankName,
                  branch,
                  type: accountType,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rastriya Banijya Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. School Operational Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Number *</label>
                <input
                  type="text"
                  required
                  placeholder="123000987654321"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="erp-input font-mono font-bold text-rose-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    placeholder="Bishrampur Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="Current">Current (चल्ती खाता)</option>
                    <option value="Savings">Savings (बचत खाता)</option>
                    <option value="Deposit">Deposit (धरौटी खाता)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsBankModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createBankMutation.isPending} className="px-5 py-2 bg-blue-700 text-white font-bold rounded-xl shadow-xs">
                  {createBankMutation.isPending ? 'Saving...' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PARTY-WISE VOUCHERS INSPECTOR MODAL ──────────────────────────── */}
      {inspectPartyId && partyVouchersData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                  <Users size={18} className="text-amber-600" />
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
              <h4 className="font-extrabold text-[#1e3a5f] uppercase tracking-wider text-[11px]">Vouchers & Transactions linked to this Party</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-[#1e3a5f] text-white text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Date (BS)</th>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Expense/Income Head</th>
                      <th className="py-2.5 px-3">Method & Cheque</th>
                      <th className="py-2.5 px-3 text-right">Amount (रू)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {partyVouchersData.expenses?.length === 0 && partyVouchersData.incomes?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">No vouchers recorded for this party yet.</td>
                      </tr>
                    ) : (
                      <>
                        {partyVouchersData.expenses?.map((e: any) => (
                          <tr key={`exp-${e.id}`} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold">{e.expenseDateBs}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#1e3a5f]">{e.voucherNo || `VOUCH-${e.id}`}</td>
                            <td className="py-2 px-3 font-bold">{e.head?.name}</td>
                            <td className="py-2 px-3 font-mono">
                              {e.paymentMedium} {e.chequeNo ? `(Chk: ${e.chequeNo})` : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                              - रू {(e.amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}

                        {partyVouchersData.incomes?.map((i: any) => (
                          <tr key={`inc-${i.id}`} className="hover:bg-emerald-50/50">
                            <td className="py-2 px-3 font-mono font-bold">{i.receivedDateBs}</td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-800">{i.voucherNo || `INC-${i.id}`}</td>
                            <td className="py-2 px-3 font-bold">{i.head?.name}</td>
                            <td className="py-2 px-3 font-mono">
                              {i.paymentMedium} {i.chequeNo ? `(Chk: ${i.chequeNo})` : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                              + रू {(i.amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </>
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
