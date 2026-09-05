'use client';

import React, { useState, useEffect } from 'react';
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
  Edit2,
  Trash2,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFiscalYearFromBS, todayBS } from '@/lib/nepali-date';

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

  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ACTIVE');
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState(false);
  const [selectedReportFYId, setSelectedReportFYId] = useState<string>('');
  const [reportSectionTab, setReportSectionTab] = useState<'overview' | 'income' | 'fees' | 'expenses' | 'payroll' | 'parties' | 'banks'>('overview');

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

  // Resolve current filtered Financial Year ID
  const effectiveFYId = selectedYearFilter === 'ALL'
    ? ''
    : selectedYearFilter === 'ACTIVE'
    ? (activeFinancialYear?.id ? String(activeFinancialYear.id) : '')
    : selectedYearFilter;

  // Annual Financial Report query
  const targetReportFyId = selectedReportFYId || (activeFinancialYear?.id ? String(activeFinancialYear.id) : '');
  const { data: annualReportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['annual-financial-report', targetReportFyId],
    queryFn: async () => {
      if (!targetReportFyId) return null;
      const res = await api.get(`/financial-years/report/${targetReportFyId}`);
      return res.data?.data;
    },
    enabled: isAnnualReportOpen && !!targetReportFyId,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['financial-summary', effectiveFYId],
    queryFn: async () => {
      const res = await api.get('/expense/summary', {
        params: { financialYearId: effectiveFYId || undefined },
      });
      return res.data?.data;
    },
  });

  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
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

  // Edit & Delete Party State & Mutations
  const [editingParty, setEditingParty] = useState<any>(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyNameNepali, setEditPartyNameNepali] = useState('');
  const [editPartyType, setEditPartyType] = useState('VENDOR');
  const [editCustomPartyType, setEditCustomPartyType] = useState('');
  const [editPanNo, setEditPanNo] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');

  const updatePartyMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/parties/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Party details updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['parties-list-all'] });
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-list-income'] });
      setEditingParty(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update party.')
  });

  const deletePartyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/parties/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Party deleted/deactivated successfully.');
      queryClient.invalidateQueries({ queryKey: ['parties-list-all'] });
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties-list-income'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete party.')
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
            <div className="flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-400/40 backdrop-blur-xs">
              <span className="text-[11px] font-bold text-emerald-300">आर्थिक वर्ष:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  setSelectedYearFilter(e.target.value);
                  if (e.target.value !== 'ALL' && e.target.value !== 'ACTIVE') {
                    setSelectedReportFYId(e.target.value);
                  } else {
                    setSelectedReportFYId(activeFinancialYear?.id ? String(activeFinancialYear.id) : '');
                  }
                }}
                className="bg-transparent text-white font-black text-xs border-none outline-hidden cursor-pointer"
              >
                <option value="ACTIVE" className="text-gray-900 font-bold">
                  चालु आ.व. {activeFinancialYear?.year ? `(${activeFinancialYear.year})` : '(२०८३/८४)'}
                </option>
                <option value="ALL" className="text-gray-900 font-bold">
                  सबै आर्थिक वर्षहरू (All Fiscal Years)
                </option>
                {financialYearsData?.map((fy: any) => (
                  <option key={fy.id} value={fy.id.toString()} className="text-gray-900 font-bold">
                    आ.व. {fy.year} {fy.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedReportFYId(effectiveFYId || (activeFinancialYear?.id ? String(activeFinancialYear.id) : ''));
                setIsAnnualReportOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#1e3a5f] px-3.5 py-2 text-xs font-black shadow-2xs transition"
              title="Print Complete Annual Financial Statement for Selected Fiscal Year"
            >
              <FileText size={14} />
              <span>वार्षिक आर्थिक प्रतिवेदन (Annual Statement)</span>
            </button>

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
                  <span>School Cash & Bank Accounts (नगद तथा बैंक खाताहरू)</span>
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
                {/* Dedicated Cash / Petty Cash Account Card */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      💵
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-xs text-emerald-950">विद्यालय नगद खाता (School Cash A/c)</p>
                        <span className="bg-emerald-200/80 text-emerald-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded">
                          CASH IN HAND
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium mt-0.5 font-nepali">
                        नगदमा संकलन भएको शुल्क, नगद अनुदान तथा दैनिक नगदी खर्च (Petty Cash Flow)
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    CASH-ACC
                  </span>
                </div>

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
                      <td className="py-3 px-4 font-bold text-[#1e3a5f]">
                        {party.vouchersCount ?? ((party._count?.expenseEntries || 0) + (party._count?.incomeEntries || 0))} vouchers
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setInspectPartyId(party.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-[#1e3a5f] hover:bg-slate-50 shadow-2xs"
                            title="View Party History & Ledger"
                          >
                            <Eye size={12} />
                            <span>Ledger</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingParty(party);
                              setEditPartyName(party.name || '');
                              setEditPartyNameNepali(party.nameNepali || '');
                              setEditPartyType(party.partyType || 'VENDOR');
                              setEditPanNo(party.panNo || '');
                              setEditPhone(party.phone || '');
                              setEditEmail(party.email || '');
                              setEditAddress(party.address || '');
                              setEditBankName(party.bankName || '');
                              setEditAccountNo(party.accountNo || '');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 shadow-2xs"
                            title="Edit Party Details"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete party "${party.name}"?`)) {
                                deletePartyMutation.mutate(party.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs"
                            title="Delete Party"
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

      {/* ─── EDIT PARTY MODAL ──────────────────────────────────────────────── */}
      {editingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                <Edit2 size={18} className="text-amber-600" />
                <span>Edit Party / Recipient (पाउने पक्ष सम्पादन)</span>
              </h3>
              <button onClick={() => setEditingParty(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalPartyType = editPartyType === 'CUSTOM' ? editCustomPartyType : editPartyType;
                updatePartyMutation.mutate({
                  id: editingParty.id,
                  payload: {
                    name: editPartyName,
                    nameNepali: editPartyNameNepali || null,
                    partyType: finalPartyType || 'VENDOR',
                    panNo: editPanNo || null,
                    phone: editPhone || null,
                    email: editEmail || null,
                    address: editAddress || null,
                    bankName: editBankName || null,
                    accountNo: editAccountNo || null,
                  }
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party / Vendor Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={editPartyName}
                    onChange={(e) => setEditPartyName(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party Name (नेपाली नाम)</label>
                  <input
                    type="text"
                    value={editPartyNameNepali}
                    onChange={(e) => setEditPartyNameNepali(e.target.value)}
                    className="erp-input font-nepali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Classification (प्रकार)</label>
                  <select
                    value={editPartyType}
                    onChange={(e) => setEditPartyType(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="VENDOR">Supplier / Vendor (व्यापारी/सप्लायर)</option>
                    <option value="WORKER">Worker / Construction (कामदार/मिस्त्री)</option>
                    <option value="SHOPKEEPER">Shopkeeper / Groceries (पसले/किराना)</option>
                    <option value="ELECTRICIAN">Electrician / Technician (प्राविधिक)</option>
                    <option value="GOVT">Government / Municipality (सरकारी निकाय)</option>
                    <option value="STAFF">Teacher / Staff (शिक्षक/कर्मचारी)</option>
                    <option value="DONOR">Donor / Contributor (चन्दादाता)</option>
                    <option value="CONTRACTOR">Contractor / Firm (ठेकेदार)</option>
                    <option value="OTHER">Other / Misc (अन्य)</option>
                    <option value="CUSTOM">+ Write Custom Classification</option>
                  </select>
                </div>
                {editPartyType === 'CUSTOM' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Custom Classification *</label>
                    <input
                      type="text"
                      required
                      value={editCustomPartyType}
                      onChange={(e) => setEditCustomPartyType(e.target.value)}
                      placeholder="e.g. Plumber, Driver..."
                      className="erp-input font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">PAN / VAT No.</label>
                    <input
                      type="text"
                      value={editPanNo}
                      onChange={(e) => setEditPanNo(e.target.value)}
                      className="erp-input font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Account No.</label>
                  <input
                    type="text"
                    value={editAccountNo}
                    onChange={(e) => setEditAccountNo(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address (ठेगाना)</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditingParty(null)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={updatePartyMutation.isPending} className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-xs">
                  {updatePartyMutation.isPending ? 'Updating...' : 'Update Party Details'}
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
                      <th className="py-2.5 px-3">Date (BS) & FY</th>
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
                            <td className="py-2 px-3">
                              <div className="font-mono font-bold text-gray-900">{e.expenseDateBs}</div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-[9px] font-bold text-amber-800 border border-amber-200">
                                आ.व. {e.financialYear?.year || getFiscalYearFromBS(e.expenseDateBs)}
                              </span>
                            </td>
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
                            <td className="py-2 px-3">
                              <div className="font-mono font-bold text-gray-900">{i.receivedDateBs}</div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                                आ.व. {i.financialYear?.year || getFiscalYearFromBS(i.receivedDateBs)}
                              </span>
                            </td>
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

      {/* ─── 9. ANNUAL FINANCIAL REPORT MODAL (वार्षिक आर्थिक प्रतिवेदन) ─────── */}
      {isAnnualReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl text-xs overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-slate-900 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-white tracking-tight flex items-center gap-2">
                    <span>वार्षिक आय-व्यय तथा आर्थिक स्थिति प्रतिवेदन</span>
                    <span className="hidden sm:inline text-xs font-normal text-slate-400">| Annual Financial Statement</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-nepali">
                    आर्थिक वर्ष: <span className="font-bold text-amber-400">आ.व. {annualReportData?.financialYear?.year || '२०८३/८४'}</span> {annualReportData?.financialYear?.startDateBs ? `(${annualReportData.financialYear.startDateBs} देखि ${annualReportData.financialYear.endDateBs} सम्म)` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={targetReportFyId}
                  onChange={(e) => setSelectedReportFYId(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800 text-white px-3 py-1.5 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
                >
                  {financialYearsData?.map((fy: any) => (
                    <option key={fy.id} value={fy.id.toString()} className="bg-slate-900 text-white">
                      आ.व. {fy.year} {fy.isActive ? '(चालु आ.व.)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (!printWin) {
                      window.print();
                      return;
                    }
                    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || 'श्री नेपाल माध्यमिक विद्यालय';
                    const sNameEn = schoolProfile?.schoolName || 'Shree Nepal Secondary School';
                    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';
                    const sDistrict = schoolProfile?.district || 'रौतहट';
                    const sProvince = schoolProfile?.province || 'मधेश प्रदेश';
                    const sPan = schoolProfile?.panNo || '३००१२३४५६';
                    const sEmis = schoolProfile?.emisCode || '३२०५०१००१';
                    const sLogo = schoolProfile?.logoUrl || '';
                    const rep = annualReportData;
                    if (!rep) return;

                    const fyStr = rep.financialYear?.year || '२०८३/८४';
                    const startBs = rep.financialYear?.startDateBs || '';
                    const endBs = rep.financialYear?.endDateBs || '';
                    const todayDate = todayBS();

                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8" />
                          <title>वार्षिक आय-व्यय प्रतिवेदन - आ.व. ${fyStr}</title>
                          <style>
                            @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
                            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 10.5px; line-height: 1.4; }
                            .report-box { border: 2px solid #1e3a5f; padding: 18px 20px; border-radius: 8px; }
                            .header-table { width: 100%; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 12px; }
                            .school-name-np { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 0; line-height: 1.2; text-align: center; }
                            .school-name-en { font-size: 11px; font-weight: 700; color: #475569; text-align: center; margin-top: 2px; }
                            .school-meta { font-size: 10px; color: #334155; text-align: center; margin-top: 2px; font-weight: 600; }
                            .report-title-badge { display: block; margin: 8px auto 0 auto; text-align: center; background: #1e3a5f; color: #fff; font-size: 12px; font-weight: 800; padding: 4px 16px; border-radius: 4px; width: fit-content; }
                            .meta-bar { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; margin-bottom: 14px; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; }
                            .sec-heading { font-size: 11.5px; font-weight: 900; padding: 4px 8px; border-radius: 4px; margin-top: 14px; margin-bottom: 6px; display: flex; justify-content: space-between; }
                            .sec-income { background: #ecfdf5; color: #065f46; border-left: 4px solid #059669; }
                            .sec-expense { background: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626; }
                            .sec-summary { background: #eff6ff; color: #1e40af; border-left: 4px solid #2563eb; }
                            .sec-misc { background: #f8fafc; color: #334155; border-left: 4px solid #64748b; }
                            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            th { background: #1e3a5f; color: #fff; padding: 5px 6px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; font-weight: 700; }
                            td { padding: 4.5px 6px; border: 1px solid #cbd5e1; vertical-align: middle; }
                            .num { text-align: right; font-family: "Courier New", Courier, monospace; font-weight: 700; }
                            .subtotal-row { background: #f8fafc; font-weight: 800; }
                            .grand-total-income { background: #dcfce7; font-weight: 900; color: #065f46; font-size: 11px; }
                            .grand-total-expense { background: #fee2e2; font-weight: 900; color: #991b1b; font-size: 11px; }
                            .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
                            .kpi-card { border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px; text-align: center; }
                            .footer-signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; page-break-inside: avoid; }
                            .sig-box { width: 170px; text-align: center; border-top: 1px solid #0f172a; padding-top: 4px; }
                          </style>
                        </head>
                        <body>
                          <div class="report-box">
                            <div class="header-table">
                              <div class="school-name-np">${sNameNp}</div>
                              <div class="school-name-en">${sNameEn}</div>
                              <div class="school-meta">
                                ${sAddress}, ${sDistrict}, ${sProvince} • EMIS Code: <strong>${sEmis}</strong> • PAN No: <strong>${sPan}</strong>
                              </div>
                              <div class="report-title-badge">वार्षिक आय-व्यय तथा आर्थिक स्थिति विवरण (ANNUAL FINANCIAL STATEMENT)</div>
                            </div>

                            <div class="meta-bar">
                              <div>आर्थिक वर्ष (Fiscal Year): <strong>आ.व. ${fyStr}</strong></div>
                              <div>अवधि: <strong>${startBs} देखि ${endBs} सम्म</strong></div>
                              <div>प्रतिवेदन मिति: <strong>${todayDate} BS</strong></div>
                            </div>

                            <!-- TOP KPI SUMMARY -->
                            <div class="kpi-grid">
                              <div class="kpi-card" style="background: #f0fdf4; border-color: #86efac;">
                                <div style="font-size: 9px; font-weight: 800; color: #166534; text-transform: uppercase;">कुल आम्दानी (Total Inflows)</div>
                                <div style="font-size: 14px; font-weight: 900; color: #14532d; font-family: monospace; margin-top: 2px;">रू ${(rep.totals?.totalIncome || 0).toLocaleString()}</div>
                              </div>
                              <div class="kpi-card" style="background: #fef2f2; border-color: #fca5a5;">
                                <div style="font-size: 9px; font-weight: 800; color: #991b1b; text-transform: uppercase;">कुल खर्च (Total Expenditures)</div>
                                <div style="font-size: 14px; font-weight: 900; color: #7f1d1d; font-family: monospace; margin-top: 2px;">रू ${(rep.totals?.totalExpenses || 0).toLocaleString()}</div>
                              </div>
                              <div class="kpi-card" style="background: ${(rep.totals?.netSurplus || 0) >= 0 ? '#eff6ff' : '#fffbeb'}; border-color: ${(rep.totals?.netSurplus || 0) >= 0 ? '#93c5fd' : '#fde68a'};">
                                <div style="font-size: 9px; font-weight: 800; color: #1e3a5f; text-transform: uppercase;">वार्षिक खुद बचत / घाटा (Net Balance)</div>
                                <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: ${(rep.totals?.netSurplus || 0) >= 0 ? '#1d4ed8' : '#b45309'}; margin-top: 2px;">
                                  ${(rep.totals?.netSurplus || 0) >= 0 ? '+' : '-'} रू ${Math.abs(rep.totals?.netSurplus || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <!-- SECTION 1: INCOME & GRANTS -->
                            <div class="sec-heading sec-income">
                              <span>१. आम्दानी तथा सरकारी अनुदान विवरण (Statement of Incomes & Grants)</span>
                              <span>उप-जम्मा: रू ${(rep.totals?.totalGeneralIncome || 0).toLocaleString()}</span>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 32px; text-align: center;">क्र.सं.</th>
                                  <th>आम्दानीको शीर्षक (Income Head)</th>
                                  <th>स्रोत / वर्ग (Category / Source Level)</th>
                                  <th style="width: 70px; text-align: center;">भौचर संख्या</th>
                                  <th style="width: 120px; text-align: right;">रकम (रू)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${(rep.incomeByCategory || []).map((cat: any, cIdx: number) => `
                                  <tr class="subtotal-row">
                                    <td style="text-align: center;">${cIdx + 1}</td>
                                    <td colspan="2"><strong>${cat.nameNepali || cat.name}</strong> (${cat.name})</td>
                                    <td style="text-align: center;">${cat.count}</td>
                                    <td class="num" style="color: #065f46;">रू ${(cat.total || 0).toLocaleString()}</td>
                                  </tr>
                                  ${(cat.heads || []).map((h: any, hIdx: number) => `
                                    <tr>
                                      <td></td>
                                      <td style="padding-left: 18px;">• ${h.nameNepali || h.name}</td>
                                      <td style="color: #64748b; font-size: 9px;">${h.name}</td>
                                      <td style="text-align: center; color: #64748b;">${h.count}</td>
                                      <td class="num">रू ${(h.amount || 0).toLocaleString()}</td>
                                    </tr>
                                  `).join('')}
                                `).join('')}
                                ${(rep.incomeByCategory || []).length === 0 ? `
                                  <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 8px;">यस आर्थिक वर्षमा कुनै सरकारी अनुदान वा आम्दानी प्रविष्टि छैन।</td></tr>
                                ` : ''}
                                <tr class="subtotal-row">
                                  <td colspan="4" style="text-align: right;">सरकारी अनुदान तथा अन्य आम्दानी जम्मा (A):</td>
                                  <td class="num" style="color: #065f46;">रू ${(rep.totals?.totalGeneralIncome || 0).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- SECTION 2: STUDENT FEE COLLECTIONS -->
                            <div class="sec-heading sec-income" style="margin-top: 10px;">
                              <span>२. विद्यार्थी शुल्क संकलन विवरण (Student Fee Collections by Head)</span>
                              <span>उप-जम्मा: रू ${(rep.totals?.totalFeeCollections || 0).toLocaleString()}</span>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 32px; text-align: center;">क्र.सं.</th>
                                  <th>शुल्कको शीर्षक (Fee Head)</th>
                                  <th style="width: 100px; text-align: center;">रसिद संख्या (Receipts)</th>
                                  <th style="width: 120px; text-align: right;">संकलित रकम (रू)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${(rep.feeByHead || []).map((f: any, fIdx: number) => `
                                  <tr>
                                    <td style="text-align: center;">${fIdx + 1}</td>
                                    <td><strong>${f.nameNepali || f.name}</strong> ${f.nameNepali ? `(${f.name})` : ''}</td>
                                    <td style="text-align: center;">${f.count} रसिद</td>
                                    <td class="num">रू ${(f.amount || 0).toLocaleString()}</td>
                                  </tr>
                                `).join('')}
                                ${(rep.feeByHead || []).length === 0 ? `
                                  <tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 8px;">यस आर्थिक वर्षमा विद्यार्थी शुल्क संकलन रेकर्ड छैन।</td></tr>
                                ` : ''}
                                <tr class="subtotal-row">
                                  <td colspan="3" style="text-align: right;">विद्यार्थी शुल्क संकलन जम्मा (B):</td>
                                  <td class="num" style="color: #065f46;">रू ${(rep.totals?.totalFeeCollections || 0).toLocaleString()}</td>
                                </tr>
                                <tr class="grand-total-income">
                                  <td colspan="3" style="text-align: right; font-size: 10.5px;">कुल जम्मा आम्दानी (TOTAL CONSOLIDATED REVENUE) [A + B]:</td>
                                  <td class="num" style="font-size: 11px;">रू ${(rep.totals?.totalIncome || 0).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- SECTION 3: OPERATIONAL & CAPITAL EXPENSES -->
                            <div class="sec-heading sec-expense" style="margin-top: 14px;">
                              <span>३. शैक्षिक, प्रशासनिक तथा मर्मत खर्च विवरण (Operating & Capital Expenses)</span>
                              <span>उप-जम्मा: रू ${(rep.totals?.totalGeneralExpenses || 0).toLocaleString()}</span>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 32px; text-align: center;">क्र.सं.</th>
                                  <th>खर्चको शीर्षक (Expense Head)</th>
                                  <th>खर्च वर्ग / लेखा कोड (Category / Code)</th>
                                  <th style="width: 70px; text-align: center;">भौचर संख्या</th>
                                  <th style="width: 120px; text-align: right;">खर्च रकम (रू)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${(rep.expenseByCategory || []).map((cat: any, cIdx: number) => `
                                  <tr class="subtotal-row">
                                    <td style="text-align: center;">${cIdx + 1}</td>
                                    <td colspan="2"><strong>${cat.nameNepali || cat.name}</strong> (${cat.name})</td>
                                    <td style="text-align: center;">${cat.count}</td>
                                    <td class="num" style="color: #991b1b;">रू ${(cat.total || 0).toLocaleString()}</td>
                                  </tr>
                                  ${(cat.heads || []).map((h: any) => `
                                    <tr>
                                      <td></td>
                                      <td style="padding-left: 18px;">• ${h.nameNepali || h.name}</td>
                                      <td style="color: #64748b; font-size: 9px;">${h.code ? `[Code: ${h.code}] ` : ''}${h.name}</td>
                                      <td style="text-align: center; color: #64748b;">${h.count}</td>
                                      <td class="num">रू ${(h.amount || 0).toLocaleString()}</td>
                                    </tr>
                                  `).join('')}
                                `).join('')}
                                ${(rep.expenseByCategory || []).length === 0 ? `
                                  <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 8px;">यस आर्थिक वर्षमा कुनै साधारण खर्च प्रविष्टि छैन।</td></tr>
                                ` : ''}
                                <tr class="subtotal-row">
                                  <td colspan="4" style="text-align: right;">शैक्षिक तथा प्रशासनिक खर्च जम्मा (C):</td>
                                  <td class="num" style="color: #991b1b;">रू ${(rep.totals?.totalGeneralExpenses || 0).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- SECTION 4: STAFF PAYROLL -->
                            <div class="sec-heading sec-expense" style="margin-top: 10px;">
                              <span>४. शिक्षक तथा कर्मचारी तलब भुक्तानी विवरण (Staff Payroll & Compensation)</span>
                              <span>उप-जम्मा: रू ${(rep.totals?.totalPayroll || 0).toLocaleString()}</span>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 32px; text-align: center;">क्र.सं.</th>
                                  <th>शिक्षक / कर्मचारीको नाम</th>
                                  <th>दरबन्दी प्रकार / तह</th>
                                  <th style="width: 60px; text-align: center;">महिना</th>
                                  <th style="width: 80px; text-align: right;">मूल तलब</th>
                                  <th style="width: 75px; text-align: right;">भत्ता/चाडपर्व</th>
                                  <th style="width: 75px; text-align: right;">कट्टी रकम</th>
                                  <th style="width: 100px; text-align: right;">खुद भुक्तानी (रू)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${(rep.payrollSummary?.teachers || []).map((t: any, tIdx: number) => `
                                  <tr>
                                    <td style="text-align: center;">${tIdx + 1}</td>
                                    <td><strong>${t.fullNameNepali || t.fullName}</strong></td>
                                    <td><span style="font-size: 8.5px; padding: 1px 4px; border-radius: 2px; background: ${t.type === 'RASTRIYA' ? '#e0f2fe' : '#fef3c7'};">${t.type === 'RASTRIYA' ? 'सरकारी दरबन्दी' : 'निजी स्रोत'}</span> ${t.taha || ''}</td>
                                    <td style="text-align: center;">${t.monthsCount} महिना</td>
                                    <td class="num">रू ${(t.totalBasic || 0).toLocaleString()}</td>
                                    <td class="num">रू ${(t.totalBhata || 0).toLocaleString()}</td>
                                    <td class="num" style="color: #dc2626;">रू ${(t.totalDeductions || 0).toLocaleString()}</td>
                                    <td class="num" style="font-weight: 800; color: #991b1b;">रू ${(t.totalNet || 0).toLocaleString()}</td>
                                  </tr>
                                `).join('')}
                                ${(rep.payrollSummary?.teachers || []).length === 0 ? `
                                  <tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 8px;">यस आर्थिक वर्षमा तलब भुक्तानी रेकर्ड गरिएको छैन।</td></tr>
                                ` : ''}
                                <tr class="subtotal-row">
                                  <td colspan="7" style="text-align: right;">शिक्षक तथा कर्मचारी तलब भुक्तानी जम्मा (D):</td>
                                  <td class="num" style="color: #991b1b;">रू ${(rep.totals?.totalPayroll || 0).toLocaleString()}</td>
                                </tr>
                                <tr class="grand-total-expense">
                                  <td colspan="7" style="text-align: right; font-size: 10.5px;">कुल जम्मा खर्च (TOTAL CONSOLIDATED EXPENDITURES) [C + D]:</td>
                                  <td class="num" style="font-size: 11px;">रू ${(rep.totals?.totalExpenses || 0).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- CONSOLIDATED NET SURPLUS / DEFICIT STATEMENT -->
                            <div class="sec-heading sec-summary" style="margin-top: 14px;">
                              <span>५. एकीकृत वित्तीय स्थिति तथा खुद बचत/घाटा (Consolidated Balance Statement)</span>
                              <span>आ.व. ${fyStr}</span>
                            </div>
                            <table>
                              <tbody>
                                <tr>
                                  <td style="width: 70%; font-weight: 800;">कुल वार्षिक आम्दानी (Total Consolidated Revenues) [A + B]:</td>
                                  <td class="num" style="color: #065f46; font-size: 11px;">रू ${(rep.totals?.totalIncome || 0).toLocaleString()}</td>
                                </tr>
                                <tr>
                                  <td style="font-weight: 800;">कुल वार्षिक खर्च तथा भुक्तानी (Total Consolidated Expenditures) [C + D]:</td>
                                  <td class="num" style="color: #991b1b; font-size: 11px;">रू ${(rep.totals?.totalExpenses || 0).toLocaleString()}</td>
                                </tr>
                                <tr style="background: ${(rep.totals?.netSurplus || 0) >= 0 ? '#ecfdf5' : '#fff1f2'}; font-size: 12px; font-weight: 900;">
                                  <td style="color: #1e3a5f;">वार्षिक खुद बचत / घाटा (NET ANNUAL SURPLUS / DEFICIT):</td>
                                  <td class="num" style="color: ${(rep.totals?.netSurplus || 0) >= 0 ? '#065f46' : '#991b1b'};">
                                    ${(rep.totals?.netSurplus || 0) >= 0 ? '(बचत Surplus) +' : '(घाटा Deficit) -'} रू ${Math.abs(rep.totals?.netSurplus || 0).toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- SECTION 6: PAYMENT MEDIUMS & VENDORS SUMMARY -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                              <div>
                                <div class="sec-heading sec-misc" style="margin-top: 0;">
                                  <span>६. भुक्तानी माध्यम विवरण (Payment Flow)</span>
                                </div>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>माध्यम (Method)</th>
                                      <th style="text-align: right;">आम्दानी (रू)</th>
                                      <th style="text-align: right;">खर्च (रू)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td><strong>नगद (CASH)</strong></td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.CASH?.income || 0).toLocaleString()}</td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.CASH?.expense || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td><strong>बैंक ट्रान्सफर (BANK)</strong></td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.BANK_TRANSFER?.income || 0).toLocaleString()}</td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.BANK_TRANSFER?.expense || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td><strong>चेक (CHEQUE)</strong></td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.CHEQUE?.income || 0).toLocaleString()}</td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.CHEQUE?.expense || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td><strong>डिजिटल / QR</strong></td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.QR_CODE?.income || 0).toLocaleString()}</td>
                                      <td class="num">रू ${(rep.paymentMediumSummary?.QR_CODE?.expense || 0).toLocaleString()}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div>
                                <div class="sec-heading sec-misc" style="margin-top: 0;">
                                  <span>७. प्रमुख पार्टी/फर्म भुक्तानी सारांश (Vendor Flow)</span>
                                </div>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>पार्टीको नाम (Party / Vendor)</th>
                                      <th style="width: 50px; text-align: center;">भौचर</th>
                                      <th style="text-align: right;">भुक्तानी रकम (रू)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${(rep.partiesSummary || []).slice(0, 5).map((p: any) => `
                                      <tr>
                                        <td><strong>${p.nameNepali || p.name}</strong> ${p.panNo ? `<span style="font-size: 8.5px; color: #64748b;">(PAN: ${p.panNo})</span>` : ''}</td>
                                        <td style="text-align: center;">${p.voucherCount}</td>
                                        <td class="num">रू ${(p.totalPaid || 0).toLocaleString()}</td>
                                      </tr>
                                    `).join('')}
                                    ${(rep.partiesSummary || []).length === 0 ? `
                                      <tr><td colspan="3" style="text-align: center; color: #94a3b8;">कुनै पार्टी लिंक गरिएको छैन।</td></tr>
                                    ` : ''}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <!-- OFFICIAL SIGNATURES -->
                            <div class="footer-signatures">
                              <div class="sig-box">
                                तयार गर्ने (लेखापाल)<br />
                                <span style="font-size: 9px; color: #64748b;">Accountant</span>
                              </div>
                              <div class="sig-box">
                                जाँच्ने (प्रधानाध्यापक)<br />
                                <span style="font-size: 9px; color: #64748b;">Headmaster</span>
                              </div>
                              <div class="sig-box">
                                स्वीकृत गर्ने (अध्यक्ष, वि.व्य.स.)<br />
                                <span style="font-size: 9px; color: #64748b;">SMC Chairperson</span>
                              </div>
                            </div>
                          </div>

                          <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                  title="Print official multi-page A4 audit report"
                >
                  <Printer size={13} />
                  <span>प्रिन्ट गर्नुहोस् (Print Report)</span>
                </button>

                <button
                  onClick={() => setIsAnnualReportOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body with Section Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200 bg-slate-100 px-5 pt-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setReportSectionTab('overview')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'overview'
                    ? 'bg-white text-[#1e3a5f] border-[#1e3a5f] shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                📊 कार्यकारी सारांश (Overview)
              </button>
              <button
                onClick={() => setReportSectionTab('income')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'income'
                    ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                📥 आम्दानी तथा अनुदान (Income)
              </button>
              <button
                onClick={() => setReportSectionTab('fees')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'fees'
                    ? 'bg-white text-blue-800 border-blue-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                🎓 विद्यार्थी शुल्क (Fees)
              </button>
              <button
                onClick={() => setReportSectionTab('expenses')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'expenses'
                    ? 'bg-white text-rose-800 border-rose-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                📤 शैक्षिक तथा मर्मत खर्च (Expenses)
              </button>
              <button
                onClick={() => setReportSectionTab('payroll')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'payroll'
                    ? 'bg-white text-purple-800 border-purple-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                👨‍🏫 शिक्षक तलब (Payroll)
              </button>
              <button
                onClick={() => setReportSectionTab('parties')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'parties'
                    ? 'bg-white text-amber-800 border-amber-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                🤝 पार्टी/फर्म (Parties)
              </button>
              <button
                onClick={() => setReportSectionTab('banks')}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs transition border-b-2 ${
                  reportSectionTab === 'banks'
                    ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent'
                }`}
              >
                🏦 बैंक तथा नगद (Banks & Cash)
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {isReportLoading ? (
                <div className="py-16 text-center text-gray-400 font-bold">प्रतिवेदन तयार हुँदैछ...</div>
              ) : annualReportData ? (
                <div>
                  {/* TAB 1: EXECUTIVE OVERVIEW */}
                  {reportSectionTab === 'overview' && (
                    <div className="space-y-4">
                      {/* 4 KPI Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">कुल आम्दानी (Total Inflow)</span>
                          <p className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                            रू {(annualReportData.totals?.totalIncome || 0).toLocaleString()}
                          </p>
                          <span className="text-[9px] text-emerald-700">अनुदान: रू {(annualReportData.totals?.totalGeneralIncome || 0).toLocaleString()} • शुल्क: रू {(annualReportData.totals?.totalFeeCollections || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-bold text-rose-800 uppercase">कुल खर्च (Total Outflow)</span>
                          <p className="text-lg font-black text-rose-900 font-mono mt-0.5">
                            रू {(annualReportData.totals?.totalExpenses || 0).toLocaleString()}
                          </p>
                          <span className="text-[9px] text-rose-700">साधारण खर्च: रू {(annualReportData.totals?.totalGeneralExpenses || 0).toLocaleString()} • तलब: रू {(annualReportData.totals?.totalPayroll || 0).toLocaleString()}</span>
                        </div>
                        <div className={`p-3.5 rounded-xl border ${
                          (annualReportData.totals?.netSurplus || 0) >= 0
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <span className="text-[10px] font-bold uppercase">वार्षिक खुद स्थिति (Net Balance)</span>
                          <p className="text-lg font-black font-mono mt-0.5">
                            {(annualReportData.totals?.netSurplus || 0) >= 0 ? '+' : '-'} रू {Math.abs(annualReportData.totals?.netSurplus || 0).toLocaleString()}
                          </p>
                          <span className="text-[9px] font-bold">{(annualReportData.totals?.netSurplus || 0) >= 0 ? 'बचत (Surplus)' : 'घाटा (Deficit)'}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-700 uppercase">कुल भौचर तथा कारोबार</span>
                          <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                            {(annualReportData.totals?.incomeVouchersCount || 0) + (annualReportData.totals?.expenseVouchersCount || 0)} भौचर
                          </p>
                          <span className="text-[9px] text-slate-500">आम्दानी: {annualReportData.totals?.incomeVouchersCount} • खर्च: {annualReportData.totals?.expenseVouchersCount}</span>
                        </div>
                      </div>

                      {/* Summary Statement Table */}
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-[#1e3a5f] px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>वार्षिक एकीकृत आय-व्यय विवरण सारांश (Consolidated Revenue vs Expenditure Statement)</span>
                          <span>आ.व. {annualReportData.financialYear?.year}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">विवरण / लेखा शीर्षक (Accounting Head / Component)</th>
                              <th className="py-2 px-3 text-center">भौचर / प्रविष्टि</th>
                              <th className="py-2 px-3 text-right">रकम (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            <tr className="hover:bg-emerald-50/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-emerald-900">१. सरकारी अनुदान तथा अन्य आम्दानी (Government Grants & Incomes)</div>
                                <div className="text-[10px] text-gray-500">केन्द्र, प्रदेश, स्थानीय तह तथा आन्तरिक अनुदान</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{annualReportData.incomes?.length || 0} भौचर</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">रू {(annualReportData.totals?.totalGeneralIncome || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-emerald-50/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-emerald-900">२. विद्यार्थी शुल्क संकलन (Student Fee Revenue)</div>
                                <div className="text-[10px] text-gray-500">भर्ना, मासिक, परीक्षा, परिचयपत्र, कम्प्युटर आदि शुल्क</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{annualReportData.feeCollections?.length || 0} रसिद</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">रू {(annualReportData.totals?.totalFeeCollections || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="bg-emerald-100/60 font-black text-emerald-900">
                              <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">कुल जम्मा आम्दानी (TOTAL CONSOLIDATED REVENUE):</td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs">रू {(annualReportData.totals?.totalIncome || 0).toLocaleString()}</td>
                            </tr>

                            <tr className="hover:bg-rose-50/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-rose-900">३. शैक्षिक, प्रशासनिक तथा मर्मत खर्च (Operating & Capital Expenses)</div>
                                <div className="text-[10px] text-gray-500">स्टेशनरी, परीक्षा, निर्माण, मर्मत, मसलन्द, इन्धन तथा विविध</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{annualReportData.expenses?.length || 0} भौचर</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">रू {(annualReportData.totals?.totalGeneralExpenses || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-rose-50/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-rose-900">४. शिक्षक तथा कर्मचारी तलब भुक्तानी (Staff Payroll Disbursement)</div>
                                <div className="text-[10px] text-gray-500">सरकारी दरबन्दी तथा निजी स्रोत शिक्षक तलब, भत्ता र चाडपर्व</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{annualReportData.payrolls?.length || 0} महिना/भुक्तानी</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">रू {(annualReportData.totals?.totalPayroll || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="bg-rose-100/60 font-black text-rose-900">
                              <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">कुल जम्मा खर्च (TOTAL CONSOLIDATED EXPENDITURES):</td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs">रू {(annualReportData.totals?.totalExpenses || 0).toLocaleString()}</td>
                            </tr>

                            <tr className={`font-black text-xs ${
                              (annualReportData.totals?.netSurplus || 0) >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
                            }`}>
                              <td colSpan={2} className="py-3 px-3 uppercase text-[11px]">
                                वार्षिक खुद बचत / घाटा (NET ANNUAL SURPLUS / DEFICIT):
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-sm">
                                {(annualReportData.totals?.netSurplus || 0) >= 0 ? '+' : '-'} रू {Math.abs(annualReportData.totals?.netSurplus || 0).toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INCOME & GRANTS */}
                  {reportSectionTab === 'income' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-emerald-800 px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>आम्दानी तथा सरकारी अनुदान विवरण (Income by Category & Head)</span>
                          <span>कुल: रू {(annualReportData.totals?.totalGeneralIncome || 0).toLocaleString()}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">आम्दानीको शीर्षक / वर्ग (Category & Head)</th>
                              <th className="py-2 px-3 text-center">भौचर संख्या</th>
                              <th className="py-2 px-3 text-right">रकम (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            {(annualReportData.incomeByCategory || []).map((cat: any, cIdx: number) => (
                              <React.Fragment key={`cat-${cIdx}`}>
                                <tr className="bg-slate-50 font-bold">
                                  <td className="py-2 px-3 text-[#1e3a5f]">{cat.nameNepali || cat.name} ({cat.name})</td>
                                  <td className="py-2 px-3 text-center text-gray-600">{cat.count}</td>
                                  <td className="py-2 px-3 text-right font-mono text-emerald-800">रू {(cat.total || 0).toLocaleString()}</td>
                                </tr>
                                {(cat.heads || []).map((h: any, hIdx: number) => (
                                  <tr key={`head-${hIdx}`} className="hover:bg-slate-50 text-gray-600">
                                    <td className="py-1.5 px-3 pl-8">• {h.nameNepali || h.name}</td>
                                    <td className="py-1.5 px-3 text-center text-gray-400">{h.count}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-700">रू {(h.amount || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                            {(annualReportData.incomeByCategory || []).length === 0 && (
                              <tr><td colSpan={3} className="py-8 text-center text-gray-400">कुनै आम्दानी प्रविष्टि भेटिएन।</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STUDENT FEES */}
                  {reportSectionTab === 'fees' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-blue-800 px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>विद्यार्थी शुल्क संकलन शीर्षकगत विवरण (Fee Collections by Head)</span>
                          <span>कुल शुल्क: रू {(annualReportData.totals?.totalFeeCollections || 0).toLocaleString()}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">शुल्कको शीर्षक (Fee Head)</th>
                              <th className="py-2 px-3 text-center">संकलित रसिद संख्या</th>
                              <th className="py-2 px-3 text-right">संकलित रकम (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            {(annualReportData.feeByHead || []).map((f: any, fIdx: number) => (
                              <tr key={`fee-${fIdx}`} className="hover:bg-blue-50/30">
                                <td className="py-2 px-3 font-bold">{f.nameNepali || f.name}</td>
                                <td className="py-2 px-3 text-center font-bold text-blue-700">{f.count} रसिद</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-blue-900">रू {(f.amount || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                            {(annualReportData.feeByHead || []).length === 0 && (
                              <tr><td colSpan={3} className="py-8 text-center text-gray-400">कुनै शुल्क संकलन रेकर्ड भेटिएन।</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: OPERATING & CAPITAL EXPENSES */}
                  {reportSectionTab === 'expenses' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-rose-800 px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>शैक्षिक तथा प्रशासनिक खर्च शीर्षकगत विवरण (Expenses by Category & Head)</span>
                          <span>कुल खर्च: रू {(annualReportData.totals?.totalGeneralExpenses || 0).toLocaleString()}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">खर्चको शीर्षक / वर्ग (Category & Head)</th>
                              <th className="py-2 px-3">लेखा कोड</th>
                              <th className="py-2 px-3 text-center">भौचर संख्या</th>
                              <th className="py-2 px-3 text-right">रकम (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            {(annualReportData.expenseByCategory || []).map((cat: any, cIdx: number) => (
                              <React.Fragment key={`exp-cat-${cIdx}`}>
                                <tr className="bg-slate-50 font-bold">
                                  <td className="py-2 px-3 text-rose-900">{cat.nameNepali || cat.name} ({cat.name})</td>
                                  <td className="py-2 px-3 text-gray-400">—</td>
                                  <td className="py-2 px-3 text-center text-gray-600">{cat.count}</td>
                                  <td className="py-2 px-3 text-right font-mono text-rose-800">रू {(cat.total || 0).toLocaleString()}</td>
                                </tr>
                                {(cat.heads || []).map((h: any, hIdx: number) => (
                                  <tr key={`exp-head-${hIdx}`} className="hover:bg-slate-50 text-gray-600">
                                    <td className="py-1.5 px-3 pl-8">• {h.nameNepali || h.name}</td>
                                    <td className="py-1.5 px-3 font-mono text-gray-500">{h.code || '-'}</td>
                                    <td className="py-1.5 px-3 text-center text-gray-400">{h.count}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-700">रू {(h.amount || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                            {(annualReportData.expenseByCategory || []).length === 0 && (
                              <tr><td colSpan={4} className="py-8 text-center text-gray-400">कुनै खर्च प्रविष्टि भेटिएन।</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: STAFF PAYROLL */}
                  {reportSectionTab === 'payroll' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-purple-800 px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>शिक्षक तथा कर्मचारी तलब भुक्तानी विवरण (Staff Payroll & Allowances)</span>
                          <span>कुल तलब भुक्तानी: रू {(annualReportData.totals?.totalPayroll || 0).toLocaleString()}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">शिक्षक / कर्मचारीको नाम</th>
                              <th className="py-2 px-3">दरबन्दी प्रकार / तह</th>
                              <th className="py-2 px-3 text-center">महिना</th>
                              <th className="py-2 px-3 text-right">मूल तलब</th>
                              <th className="py-2 px-3 text-right">भत्ता/चाडपर्व</th>
                              <th className="py-2 px-3 text-right">कट्टी रकम</th>
                              <th className="py-2 px-3 text-right">खुद भुक्तानी (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            {(annualReportData.payrollSummary?.teachers || []).map((t: any, tIdx: number) => (
                              <tr key={`t-${tIdx}`} className="hover:bg-purple-50/30">
                                <td className="py-2 px-3 font-bold">{t.fullNameNepali || t.fullName}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    t.type === 'RASTRIYA' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {t.type === 'RASTRIYA' ? 'सरकारी दरबन्दी' : 'निजी स्रोत'}
                                  </span> {t.taha || ''}
                                </td>
                                <td className="py-2 px-3 text-center font-bold">{t.monthsCount} महिना</td>
                                <td className="py-2 px-3 text-right font-mono">रू {(t.totalBasic || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono">रू {(t.totalBhata || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-600">रू {(t.totalDeductions || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-purple-900">रू {(t.totalNet || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                            {(annualReportData.payrollSummary?.teachers || []).length === 0 && (
                              <tr><td colSpan={7} className="py-8 text-center text-gray-400">यस आर्थिक वर्षमा कुनै तलब भुक्तानी भेटिएन।</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: PARTIES & VENDORS */}
                  {reportSectionTab === 'parties' && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <div className="bg-amber-700 px-4 py-2.5 text-white font-bold text-xs flex justify-between">
                          <span>पार्टी, फर्म तथा सप्लायर्स भुक्तानी सारांश (Parties & Vendors Summary)</span>
                          <span>{annualReportData.partiesSummary?.length || 0} पार्टीहरू</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                            <tr>
                              <th className="py-2 px-3">पार्टीको नाम (Party Name)</th>
                              <th className="py-2 px-3">PAN No / सम्पर्क</th>
                              <th className="py-2 px-3 text-center">भौचर संख्या</th>
                              <th className="py-2 px-3 text-right">भुक्तानी भएको रकम (रू)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800 text-[11px]">
                            {(annualReportData.partiesSummary || []).map((p: any, pIdx: number) => (
                              <tr key={`party-${pIdx}`} className="hover:bg-amber-50/30">
                                <td className="py-2 px-3 font-bold text-gray-900">{p.nameNepali || p.name}</td>
                                <td className="py-2 px-3 font-mono text-gray-600">{p.panNo || 'N/A'} • {p.phone || 'N/A'}</td>
                                <td className="py-2 px-3 text-center font-bold text-amber-800">{p.voucherCount} भौचर</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-rose-700">रू {(p.totalPaid || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                            {(annualReportData.partiesSummary || []).length === 0 && (
                              <tr><td colSpan={4} className="py-8 text-center text-gray-400">कुनै पार्टी/सप्लायर्स कारोबार भेटिएन।</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 7: BANKS & CASH */}
                  {reportSectionTab === 'banks' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                          <div className="bg-teal-800 px-4 py-2.5 text-white font-bold text-xs">
                            भुक्तानी माध्यम अनुसार कारोबार (Payment Mediums)
                          </div>
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-100 text-gray-700 text-[10px] uppercase font-bold border-b">
                              <tr>
                                <th className="py-2 px-3">माध्यम</th>
                                <th className="py-2 px-3 text-right">आम्दानी (रू)</th>
                                <th className="py-2 px-3 text-right">खर्च (रू)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-800">
                              <tr>
                                <td className="py-2 px-3 font-bold">नगद (CASH)</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">रू {(annualReportData.paymentMediumSummary?.CASH?.income || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700">रू {(annualReportData.paymentMediumSummary?.CASH?.expense || 0).toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-bold">बैंक ट्रान्सफर (BANK)</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">रू {(annualReportData.paymentMediumSummary?.BANK_TRANSFER?.income || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700">रू {(annualReportData.paymentMediumSummary?.BANK_TRANSFER?.expense || 0).toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-bold">चेक (CHEQUE)</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">रू {(annualReportData.paymentMediumSummary?.CHEQUE?.income || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700">रू {(annualReportData.paymentMediumSummary?.CHEQUE?.expense || 0).toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 font-bold">डिजिटल / QR</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700">रू {(annualReportData.paymentMediumSummary?.QR_CODE?.income || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700">रू {(annualReportData.paymentMediumSummary?.QR_CODE?.expense || 0).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                          <div className="bg-slate-800 px-4 py-2.5 text-white font-bold text-xs">
                            विद्यालयका बैंक खाताहरू (Registered Bank Accounts)
                          </div>
                          <div className="p-3 divide-y divide-gray-100">
                            {(annualReportData.bankAccounts || []).map((b: any) => (
                              <div key={b.id} className="py-2 flex justify-between items-center text-[11px]">
                                <div>
                                  <div className="font-bold text-gray-900">{b.bankName} - {b.branch || 'Branch'}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">A/C: {b.accountNo} ({b.accountName})</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  {b.accountType || 'Current'}
                                </span>
                              </div>
                            ))}
                            {(annualReportData.bankAccounts || []).length === 0 && (
                              <div className="py-4 text-center text-gray-400">कुनै बैंक खाता दर्ता गरिएको छैन।</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
              <span className="text-[11px] text-gray-500 font-nepali">
                नेपाल सरकार स्थानीय तह विद्यालय आर्थिक नियमावली ढाँचा अनुसार तयार पारिएको प्रतिवेदन
              </span>
              <button
                onClick={() => setIsAnnualReportOpen(false)}
                className="rounded-xl bg-[#1e3a5f] text-white px-5 py-2 text-xs font-bold shadow-xs hover:bg-[#2a5280] transition"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
