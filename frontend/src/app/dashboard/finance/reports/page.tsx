'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, getFiscalYearFromBS } from '@/lib/nepali-date';
import {
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  Receipt,
  Layers,
  Search,
  Users,
  Scale,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Landmark,
} from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<'trial_balance' | 'income_expense' | 'balance_sheet' | 'ledger' | 'party_ledger'>('trial_balance');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ACTIVE');

  // Ledger Tab State
  const [ledgerType, setLedgerType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [selectedLedgerHeadId, setSelectedLedgerHeadId] = useState<string>('');

  // Party Ledger Tab State
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });

  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];
  const effectiveFYId = selectedYearFilter === 'ALL'
    ? ''
    : selectedYearFilter === 'ACTIVE'
    ? (activeFinancialYear?.id ? String(activeFinancialYear.id) : '')
    : selectedYearFilter;

  const currentFYName = selectedYearFilter === 'ALL'
    ? 'सबै आर्थिक वर्षहरू (All FY)'
    : `आ.व. ${financialYearsData?.find((f: any) => f.id.toString() === effectiveFYId)?.year || activeFinancialYear?.year || '२०८३/८४'}`;

  // Fetch Income Heads & Categories
  const { data: incomeHeads = [] } = useQuery({
    queryKey: ['income-heads-reports'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  const { data: incomeCategories = [] } = useQuery({
    queryKey: ['income-categories-reports'],
    queryFn: async () => {
      const res = await api.get('/income/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Expense Heads & Categories
  const { data: expenseHeads = [] } = useQuery({
    queryKey: ['expense-heads-reports'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expense-categories-reports'],
    queryFn: async () => {
      const res = await api.get('/expense/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Parties
  const { data: parties = [] } = useQuery({
    queryKey: ['parties-reports'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  // Fetch Income Entries
  const { data: incomeEntriesData, isLoading: isIncomeLoading } = useQuery({
    queryKey: ['income-entries-reports', effectiveFYId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveFYId) params.append('financialYearId', effectiveFYId);
      params.append('limit', '1000');
      const res = await api.get(`/income/entries?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch Expense Entries
  const { data: expenseEntriesData, isLoading: isExpenseLoading } = useQuery({
    queryKey: ['expense-entries-reports', effectiveFYId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveFYId) params.append('financialYearId', effectiveFYId);
      params.append('limit', '1000');
      const res = await api.get(`/expense/entries?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch Fee Collections
  const { data: feeCollectionsData } = useQuery({
    queryKey: ['fee-collections-reports', effectiveFYId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveFYId) params.append('financialYearId', effectiveFYId);
      params.append('limit', '1000');
      const res = await api.get(`/income/fee-collections?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch Balance Sheet Report
  const { data: balanceSheetData, isLoading: isBalanceSheetLoading } = useQuery({
    queryKey: ['balance-sheet-report', effectiveFYId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveFYId) params.append('financialYearId', effectiveFYId);
      params.append('todayBs', todayBS());
      const res = await api.get(`/finance-reports/balance-sheet?${params.toString()}`);
      return res.data?.data || null;
    },
  });

  const incomeEntries = incomeEntriesData || [];
  const expenseEntries = expenseEntriesData || [];
  const feeCollections = feeCollectionsData || [];

  // ── 1. TRIAL BALANCE CALCULATIONS ──────────────────────────────────────────
  const trialBalanceData = useMemo(() => {
    // Group Expenses by Head (Debit side)
    const expenseHeadTotals: { [headId: number]: { head: any; total: number } } = {};
    expenseEntries.forEach((entry: any) => {
      const hId = entry.headId || (entry.head?.id);
      if (!hId) return;
      if (!expenseHeadTotals[hId]) {
        const headObj = expenseHeads.find((h: any) => h.id === hId) || entry.head || { id: hId, name: 'General Expense' };
        expenseHeadTotals[hId] = { head: headObj, total: 0 };
      }
      expenseHeadTotals[hId].total += entry.amount || 0;
    });

    // Group Incomes by Head (Credit side)
    const incomeHeadTotals: { [headId: number]: { head: any; total: number } } = {};
    incomeEntries.forEach((entry: any) => {
      const hId = entry.headId || (entry.head?.id);
      if (!hId) return;
      if (!incomeHeadTotals[hId]) {
        const headObj = incomeHeads.find((h: any) => h.id === hId) || entry.head || { id: hId, name: 'General Income' };
        incomeHeadTotals[hId] = { head: headObj, total: 0 };
      }
      incomeHeadTotals[hId].total += entry.amount || 0;
    });

    // Add Student Fees as a separate credit line
    const totalStudentFees = feeCollections.reduce((s: number, f: any) => s + (f.amount || 0), 0);

    const totalDebit = Object.values(expenseHeadTotals).reduce((s, h) => s + h.total, 0);
    const totalCredit = Object.values(incomeHeadTotals).reduce((s, h) => s + h.total, 0) + totalStudentFees;

    return {
      expenses: Object.values(expenseHeadTotals),
      incomes: Object.values(incomeHeadTotals),
      totalStudentFees,
      totalDebit,
      totalCredit,
      difference: totalCredit - totalDebit,
    };
  }, [expenseEntries, incomeEntries, feeCollections, expenseHeads, incomeHeads]);

  // ── 2. INCOME & EXPENDITURE STATEMENT CALCULATIONS ──────────────────────────
  const incomeExpenditureData = useMemo(() => {
    // Group Income by Category
    const incomeCatsMap: { [catName: string]: { category: any; heads: { [headName: string]: number }; subtotal: number } } = {};
    incomeEntries.forEach((entry: any) => {
      const cat = entry.head?.category || { name: 'Direct Income (सोझै आम्दानी)' };
      const catName = cat.name || 'Other Income';
      const headName = entry.head?.name || 'General';
      if (!incomeCatsMap[catName]) {
        incomeCatsMap[catName] = { category: cat, heads: {}, subtotal: 0 };
      }
      incomeCatsMap[catName].heads[headName] = (incomeCatsMap[catName].heads[headName] || 0) + (entry.amount || 0);
      incomeCatsMap[catName].subtotal += (entry.amount || 0);
    });

    // Add Student Fees under 'Student Fees & Collections' category
    if (trialBalanceData.totalStudentFees > 0) {
      const feeCatName = 'Student Fee Collections (विद्यार्थी शुल्क संकलन)';
      if (!incomeCatsMap[feeCatName]) {
        incomeCatsMap[feeCatName] = { category: { name: feeCatName }, heads: {}, subtotal: 0 };
      }
      feeCollections.forEach((fc: any) => {
        const fhName = fc.feeHead?.name || 'Tuition & General Fee';
        incomeCatsMap[feeCatName].heads[fhName] = (incomeCatsMap[feeCatName].heads[fhName] || 0) + (fc.amount || 0);
      });
      incomeCatsMap[feeCatName].subtotal += trialBalanceData.totalStudentFees;
    }

    // Group Expense by Category
    const expenseCatsMap: { [catName: string]: { category: any; heads: { [headName: string]: number }; subtotal: number } } = {};
    expenseEntries.forEach((entry: any) => {
      const cat = entry.head?.category || { name: 'General Operating (साधारण सञ्चालन)' };
      const catName = cat.name || 'Operating Expenses';
      const headName = entry.head?.name || 'General Expense';
      if (!expenseCatsMap[catName]) {
        expenseCatsMap[catName] = { category: cat, heads: {}, subtotal: 0 };
      }
      expenseCatsMap[catName].heads[headName] = (expenseCatsMap[catName].heads[headName] || 0) + (entry.amount || 0);
      expenseCatsMap[catName].subtotal += (entry.amount || 0);
    });

    const totalIncome = Object.values(incomeCatsMap).reduce((s, c) => s + c.subtotal, 0);
    const totalExpense = Object.values(expenseCatsMap).reduce((s, c) => s + c.subtotal, 0);
    const netSurplus = totalIncome - totalExpense;

    return {
      incomeCategories: Object.values(incomeCatsMap),
      expenseCategories: Object.values(expenseCatsMap),
      totalIncome,
      totalExpense,
      netSurplus,
    };
  }, [incomeEntries, expenseEntries, feeCollections, trialBalanceData.totalStudentFees]);

  // ── 3. LEDGER FOR SELECTED HEAD ───────────────────────────────────────────
  const ledgerEntries = useMemo(() => {
    if (!selectedLedgerHeadId) return [];
    const headIdNum = parseInt(selectedLedgerHeadId);

    if (ledgerType === 'INCOME') {
      let running = 0;
      return incomeEntries
        .filter((e: any) => (e.headId === headIdNum || e.head?.id === headIdNum))
        .sort((a: any, b: any) => (a.receivedDateBs || '').localeCompare(b.receivedDateBs || ''))
        .map((e: any, idx: number) => {
          running += e.amount || 0;
          return {
            sn: idx + 1,
            dateBs: e.receivedDateBs,
            particulars: e.sourceOrg || e.remarks || e.head?.name || 'Income Received',
            voucherNo: e.voucherNo || `INC-${e.id}`,
            dr: 0,
            cr: e.amount || 0,
            balance: running,
            paymentMedium: e.paymentMedium,
            depositedIn: e.depositedInAccount,
          };
        });
    } else {
      let running = 0;
      return expenseEntries
        .filter((e: any) => (e.headId === headIdNum || e.head?.id === headIdNum))
        .sort((a: any, b: any) => (a.expenseDateBs || '').localeCompare(b.expenseDateBs || ''))
        .map((e: any, idx: number) => {
          running += e.amount || 0;
          return {
            sn: idx + 1,
            dateBs: e.expenseDateBs,
            particulars: e.paidTo || e.description || e.remarks || e.head?.name || 'Expense Paid',
            voucherNo: e.voucherNo || `EXP-${e.id}`,
            dr: e.amount || 0,
            cr: 0,
            balance: running,
            paymentMedium: e.paymentMedium,
            paidFrom: e.paidFromAccount,
          };
        });
    }
  }, [selectedLedgerHeadId, ledgerType, incomeEntries, expenseEntries]);

  // ── 4. PARTY LEDGER ───────────────────────────────────────────────────────
  const partyLedgerEntries = useMemo(() => {
    if (!selectedPartyId) return [];
    const pId = parseInt(selectedPartyId);
    let running = 0;

    return expenseEntries
      .filter((e: any) => e.partyId === pId)
      .sort((a: any, b: any) => (a.expenseDateBs || '').localeCompare(b.expenseDateBs || ''))
      .map((e: any, idx: number) => {
        running += e.amount || 0;
        return {
          sn: idx + 1,
          dateBs: e.expenseDateBs,
          billNo: e.billNo || '—',
          head: e.head?.name || 'Expense',
          particulars: e.description || e.remarks || `Payment to ${e.paidTo}`,
          voucherNo: e.voucherNo || `V-${e.id}`,
          amount: e.amount || 0,
          runningTotal: running,
          paymentMedium: e.paymentMedium,
        };
      });
  }, [selectedPartyId, expenseEntries]);

  const selectedPartyObj = parties.find((p: any) => p.id.toString() === selectedPartyId);
  const totalPaidToParty = partyLedgerEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  // ── Print Helper ──────────────────────────────────────────────────────────

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Scale size={24} className="text-emerald-700" />
            <span>Financial Statements & Audit Reports (वित्तीय प्रतिवेदन तथा लेखा परीक्षण)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            दोहोरो लेखा प्रणाली बमोजिम ट्रायल ब्यालेन्स, आय-व्यय विवरण, खातागत लेजर तथा पार्टी खाता
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-4 py-2 text-xs font-bold transition shadow-2xs"
          >
            <Printer size={14} />
            <span>Print Report (प्रिन्ट)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 text-xs font-bold no-print">
        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'trial_balance'
              ? 'border-emerald-600 text-emerald-800 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Scale size={14} />
          <span>1. Trial Balance (दोहोरो लेखा परीक्षण)</span>
        </button>

        <button
          onClick={() => setActiveTab('income_expense')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'income_expense'
              ? 'border-[#1e3a5f] text-[#1e3a5f] font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={14} />
          <span>2. Income & Expenditure Statement (आय-व्यय विवरण)</span>
        </button>

        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'balance_sheet'
              ? 'border-indigo-600 text-indigo-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Landmark size={14} />
          <span>3. Balance Sheet (वासलात)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-purple-600 text-purple-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers size={14} />
          <span>4. Account Head Ledger (खातागत लेजर)</span>
        </button>

        <button
          onClick={() => setActiveTab('party_ledger')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-2 ${
            activeTab === 'party_ledger'
              ? 'border-rose-600 text-rose-800 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={14} />
          <span>5. Party / Vendor Ledger (पार्टी/सप्लायर खाता)</span>
        </button>
      </div>

      {/* ─── PRINT LETTERHEAD HEADER ────────────────────────────────────────── */}
      <div className="hidden print:block text-center border-b-2 border-[#1e3a5f] pb-3 mb-4">
        <h2 className="text-xl font-black text-[#1e3a5f]">
          {school?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट'}
        </h2>
        <p className="text-xs font-bold text-gray-700">
          {school?.name || 'Shree Nepal Secondary School'} • {school?.address || 'Bishrampur, Rautahat'} (IEMIS: {school?.emisCode || '320160005'})
        </p>
        <div className="mt-2 inline-block bg-slate-100 border border-slate-300 px-3 py-0.5 rounded text-xs font-extrabold uppercase text-[#1e3a5f]">
          {activeTab === 'trial_balance' && 'TRIAL BALANCE STATEMENT (दोहोरो लेखा परीक्षण विवरण)'}
          {activeTab === 'income_expense' && 'INCOME & EXPENDITURE STATEMENT (आय-व्यय विवरण)'}
          {activeTab === 'balance_sheet' && 'BALANCE SHEET STATEMENT (वासलात विवरण)'}
          {activeTab === 'ledger' && 'ACCOUNT HEAD GENERAL LEDGER (खाता लेजर)'}
          {activeTab === 'party_ledger' && `PARTY LEDGER — ${selectedPartyObj?.name || 'ALL PARTIES'}`}
        </div>
        <p className="text-[11px] font-bold text-gray-600 mt-1">
          {currentFYName} • Date: {todayBS()} BS
        </p>
      </div>

      {/* ────────────────── TAB 1: TRIAL BALANCE ─────────────────────────── */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-blue-800">Total Debit (कुल खर्च/भुक्तानी Dr.)</span>
              <p className="text-2xl font-black text-[#1e3a5f] font-mono mt-1">
                रू {trialBalanceData.totalDebit.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{trialBalanceData.expenses.length} Expense Heads</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-emerald-800">Total Credit (कुल आम्दानी/प्राप्ति Cr.)</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                रू {trialBalanceData.totalCredit.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {trialBalanceData.incomes.length} Income Heads + Student Fees
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-purple-800">Net Surplus / Balance (बचत/बाँकी)</span>
              <p className="text-2xl font-black text-purple-900 font-mono mt-1">
                रू {trialBalanceData.difference.toLocaleString()}
              </p>
              <p className="text-[11px] text-purple-600 font-bold mt-0.5">
                {trialBalanceData.difference >= 0 ? 'Surplus (आम्दानी बढी)' : 'Deficit (खर्च बढी)'}
              </p>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Scale size={16} className="text-emerald-400" />
                <span>Trial Balance (दोहोरो लेखा परीक्षण) — {currentFYName}</span>
              </h3>
              <span className="text-xs text-blue-200 font-mono">Date: {todayBS()} BS</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-gray-800 font-extrabold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-12 text-center">S.N.</th>
                  <th className="p-3 w-28 font-mono">Head Code</th>
                  <th className="p-3">Account Head & Category (लेखा शीर्षक)</th>
                  <th className="p-3 text-right w-44">DEBIT (Dr. रू - खर्च)</th>
                  <th className="p-3 text-right w-44">CREDIT (Cr. रू - आम्दानी)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 1. EXPENSES (DEBITS) */}
                <tr className="bg-rose-50/60 font-bold text-rose-950">
                  <td colSpan={5} className="p-2.5 px-3">
                    A. EXPENDITURES & PAYMENTS (खर्च तथा भुक्तानी डेबिट खाता)
                  </td>
                </tr>
                {trialBalanceData.expenses.map((exp: any, idx: number) => (
                  <tr key={`exp-${exp.head.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-rose-800">{exp.head.code || '—'}</td>
                    <td className="p-3">
                      <strong className="text-gray-900">{exp.head.name}</strong>
                      {exp.head.nameNepali && <span className="text-gray-500 font-nepali ml-1.5">({exp.head.nameNepali})</span>}
                      {exp.head.category?.name && (
                        <span className="text-[10px] text-gray-400 block">{exp.head.category.name}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-rose-700">
                      रू {exp.total.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-300">—</td>
                  </tr>
                ))}

                {/* 2. INCOMES (CREDITS) */}
                <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                  <td colSpan={5} className="p-2.5 px-3">
                    B. REVENUES, GRANTS & DONATIONS (आम्दानी तथा अनुदान क्रेडिट खाता)
                  </td>
                </tr>
                {trialBalanceData.incomes.map((inc: any, idx: number) => (
                  <tr key={`inc-${inc.head.id}`} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-emerald-800">{inc.head.code || '—'}</td>
                    <td className="p-3">
                      <strong className="text-gray-900">{inc.head.name}</strong>
                      {inc.head.nameNepali && <span className="text-gray-500 font-nepali ml-1.5">({inc.head.nameNepali})</span>}
                      {inc.head.category?.name && (
                        <span className="text-[10px] text-gray-400 block">{inc.head.category.name}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-300">—</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                      रू {inc.total.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* 3. STUDENT FEES */}
                {trialBalanceData.totalStudentFees > 0 && (
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono text-gray-400">*</td>
                    <td className="p-3 font-mono font-bold text-emerald-800">40101</td>
                    <td className="p-3">
                      <strong className="text-gray-900">Student Fee Collections (विद्यार्थी शुल्क संकलन)</strong>
                      <span className="text-[10px] text-gray-400 block">Tuition, Exam, Admission & Verified Receipts</span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-300">—</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                      रू {trialBalanceData.totalStudentFees.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#1e3a5f] text-white font-extrabold">
                <tr>
                  <td colSpan={3} className="p-3.5 text-right uppercase tracking-wider text-xs">
                    Grand Total Balancing (कुल सन्तुलन):
                  </td>
                  <td className="p-3.5 text-right font-mono text-rose-300 text-sm">
                    Dr. रू {trialBalanceData.totalDebit.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-300 text-sm">
                    Cr. रू {trialBalanceData.totalCredit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 2: INCOME & EXPENDITURE ───────────────────── */}
      {activeTab === 'income_expense' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EXPENDITURE SECTION (LEFT / DR) */}
            <div className="rounded-2xl border border-rose-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-rose-800 px-4 py-3 text-white flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <TrendingDown size={16} />
                  <span>Expenditure (व्यय / खर्च खाता)</span>
                </h3>
                <span className="text-xs font-mono font-bold bg-rose-950 px-2.5 py-0.5 rounded text-rose-200">
                  रू {incomeExpenditureData.totalExpense.toLocaleString()}
                </span>
              </div>

              <div className="p-4 divide-y divide-gray-100 text-xs">
                {incomeExpenditureData.expenseCategories.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No expenses recorded for this fiscal year.</p>
                ) : (
                  incomeExpenditureData.expenseCategories.map((cat: any) => (
                    <div key={cat.category.name} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between font-extrabold text-gray-800">
                        <span className="text-rose-900">{cat.category.name}</span>
                        <span className="font-mono text-rose-700">रू {cat.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="pl-3 space-y-1">
                        {Object.entries(cat.heads).map(([headName, amt]) => (
                          <div key={headName} className="flex items-center justify-between text-gray-600 text-[11px]">
                            <span>• {headName}</span>
                            <span className="font-mono">रू {(amt as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* INCOME SECTION (RIGHT / CR) */}
            <div className="rounded-2xl border border-emerald-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-emerald-800 px-4 py-3 text-white flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <TrendingUp size={16} />
                  <span>Income & Revenues (आय / आम्दानी खाता)</span>
                </h3>
                <span className="text-xs font-mono font-bold bg-emerald-950 px-2.5 py-0.5 rounded text-emerald-200">
                  रू {incomeExpenditureData.totalIncome.toLocaleString()}
                </span>
              </div>

              <div className="p-4 divide-y divide-gray-100 text-xs">
                {incomeExpenditureData.incomeCategories.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No income recorded for this fiscal year.</p>
                ) : (
                  incomeExpenditureData.incomeCategories.map((cat: any) => (
                    <div key={cat.category.name} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between font-extrabold text-gray-800">
                        <span className="text-emerald-900">{cat.category.name}</span>
                        <span className="font-mono text-emerald-700">रू {cat.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="pl-3 space-y-1">
                        {Object.entries(cat.heads).map(([headName, amt]) => (
                          <div key={headName} className="flex items-center justify-between text-gray-600 text-[11px]">
                            <span>• {headName}</span>
                            <span className="font-mono">रू {(amt as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Net Result Bar */}
          <div className="rounded-2xl bg-[#1e3a5f] text-white p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Net Statement Result (खुद आय-व्यय नतिजा):
              </span>
              <h3 className="text-xl font-black mt-0.5">
                {incomeExpenditureData.netSurplus >= 0
                  ? 'आम्दानी बढी / खुद बचत (Net Surplus Balance)'
                  : 'खर्च बढी / खुद घाटा (Net Deficit)'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black font-mono text-emerald-300">
                रू {Math.abs(incomeExpenditureData.netSurplus).toLocaleString()}
              </span>
              <p className="text-[11px] text-blue-200">
                Total Income (Rs. {incomeExpenditureData.totalIncome.toLocaleString()}) - Total Expense (Rs. {incomeExpenditureData.totalExpense.toLocaleString()})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 3: BALANCE SHEET (वासलात) ────────────────── */}
      {activeTab === 'balance_sheet' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
            <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-indigo-800">Total Assets (कुल सम्पत्ति)</span>
              <p className="text-2xl font-black text-indigo-950 font-mono mt-1">
                रू {(balanceSheetData?.grandTotalAssets || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">Current & Fixed Assets combined</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-rose-800">Current Liabilities (चालु दायित्व)</span>
              <p className="text-2xl font-black text-rose-900 font-mono mt-1">
                रू {(balanceSheetData?.currentLiabilities?.totalCurrentLiabilities || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">Payables & Retention Deposits</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-emerald-800">Capital & Reserves (पुँजी तथा कोष)</span>
              <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
                रू {(balanceSheetData?.capitalAndEquity?.totalCapitalFund || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">General + Reserve + Net Surplus</p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-2xs">
              <span className="text-xs font-bold uppercase text-blue-800">Balance Status (सन्तुलन अवस्था)</span>
              <div className="mt-1.5 flex items-center gap-2">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <span className="text-sm font-black text-emerald-700">
                  {balanceSheetData?.isBalanced !== false ? 'Balanced (सन्तुलित)' : 'Unbalanced'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">Assets = Liabilities + Equity</p>
            </div>
          </div>

          {/* Balance Sheet Statement Layout (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── LEFT COLUMN: ASSETS (सम्पत्ति खाता) ── */}
            <div className="rounded-2xl border border-blue-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <Landmark size={16} className="text-amber-400" />
                  <span>ASSETS (सम्पत्ति विवरण)</span>
                </h3>
                <span className="text-xs font-mono font-black bg-blue-900/80 px-2.5 py-0.5 rounded text-amber-300">
                  रू {(balanceSheetData?.grandTotalAssets || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-4 space-y-5 text-xs">
                {/* 1. Current Assets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                    <span className="font-black text-[#1e3a5f] uppercase tracking-wide text-[11px]">
                      1. Current Assets (चालु सम्पत्ति)
                    </span>
                    <span className="font-mono font-bold text-blue-900">
                      रू {(balanceSheetData?.currentAssets?.totalCurrentAssets || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 pl-2">
                    {/* Cash */}
                    <div className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-50">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Cash on Hand (नगद मौज्दात)
                      </span>
                      <span className="font-mono font-bold text-gray-900">
                        रू {(balanceSheetData?.currentAssets?.cashOnHand || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Bank Accounts */}
                    <div className="space-y-1.5 py-1 border-b border-gray-50">
                      <div className="flex items-center justify-between text-gray-700 font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Bank Accounts & Deposits (बैंक मौज्दात)
                        </span>
                        <span className="font-mono text-blue-900">
                          रू {(balanceSheetData?.currentAssets?.totalBankBalances || 0).toLocaleString()}
                        </span>
                      </div>
                      {balanceSheetData?.currentAssets?.bankAccounts?.map((b: any) => (
                        <div key={b.id} className="pl-4 flex items-center justify-between text-gray-500 text-[11px]">
                          <span>
                            • {b.bankName} <span className="font-mono text-[10px]">({b.accountNumber})</span>
                          </span>
                          <span className="font-mono text-gray-700">रू {(b.balance || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Student Receivables */}
                    <div className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-50">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Student Fee Receivables (उठ्न बाँकी शुल्क)
                      </span>
                      <span className="font-mono font-bold text-amber-900">
                        रू {(balanceSheetData?.currentAssets?.feeReceivables || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Inventory Stock */}
                    <div className="flex items-center justify-between text-gray-700 py-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        Inventory Stock Valuation (जिन्सी मौज्दात)
                      </span>
                      <span className="font-mono font-bold text-gray-900">
                        रू {(balanceSheetData?.currentAssets?.inventoryStockValue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Fixed Assets */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                    <span className="font-black text-[#1e3a5f] uppercase tracking-wide text-[11px]">
                      2. Fixed Assets (स्थिर सम्पत्ति)
                    </span>
                    <span className="font-mono font-bold text-blue-900">
                      रू {(balanceSheetData?.fixedAssets?.totalFixedAssets || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    {balanceSheetData?.fixedAssets?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-50 last:border-0">
                        <span>• {item.name}</span>
                        <span className="font-mono font-bold text-gray-900">रू {(item.value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Assets Bar */}
              <div className="bg-blue-50 border-t-2 border-[#1e3a5f] p-3.5 px-4 flex items-center justify-between font-black text-sm">
                <span className="text-[#1e3a5f] uppercase tracking-wider text-xs">
                  Grand Total Assets (कुल सम्पत्ति):
                </span>
                <span className="font-mono text-base text-[#1e3a5f]">
                  रू {(balanceSheetData?.grandTotalAssets || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* ── RIGHT COLUMN: LIABILITIES & CAPITAL FUND (दायित्व तथा पुँजी कोष) ── */}
            <div className="rounded-2xl border border-emerald-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <Scale size={16} className="text-emerald-400" />
                  <span>LIABILITIES & CAPITAL (दायित्व तथा पुँजी कोष)</span>
                </h3>
                <span className="text-xs font-mono font-black bg-blue-900/80 px-2.5 py-0.5 rounded text-emerald-300">
                  रू {(balanceSheetData?.grandTotalLiabilitiesAndEquity || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-4 space-y-5 text-xs">
                {/* 1. Current Liabilities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                    <span className="font-black text-rose-950 uppercase tracking-wide text-[11px]">
                      1. Current Liabilities (चालु दायित्व)
                    </span>
                    <span className="font-mono font-bold text-rose-900">
                      रू {(balanceSheetData?.currentLiabilities?.totalCurrentLiabilities || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    {balanceSheetData?.currentLiabilities?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-50 last:border-0">
                        <span>• {item.name}</span>
                        <span className="font-mono font-bold text-rose-800">रू {(item.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Capital & Reserve Funds */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                    <span className="font-black text-emerald-950 uppercase tracking-wide text-[11px]">
                      2. Capital Fund & Reserves (पुँजी कोष तथा बचत)
                    </span>
                    <span className="font-mono font-bold text-emerald-900">
                      रू {(balanceSheetData?.capitalAndEquity?.totalCapitalFund || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    {balanceSheetData?.capitalAndEquity?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-50 last:border-0">
                        <span className={item.name.includes('Current Year') ? 'font-bold text-emerald-900' : ''}>
                          • {item.name}
                        </span>
                        <span className={`font-mono font-bold ${item.name.includes('Current Year') ? 'text-emerald-700' : 'text-gray-900'}`}>
                          रू {(item.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Capital Bar */}
              <div className="bg-emerald-50 border-t-2 border-[#1e3a5f] p-3.5 px-4 flex items-center justify-between font-black text-sm">
                <span className="text-emerald-950 uppercase tracking-wider text-xs">
                  Grand Total Liabilities & Capital (कुल दायित्व तथा पुँजी):
                </span>
                <span className="font-mono text-base text-emerald-900">
                  रू {(balanceSheetData?.grandTotalLiabilitiesAndEquity || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Statement Verification Footer Bar */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 px-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  Balance Sheet Verification (दोहोरो लेखा परीक्षण प्रमाणिकरण)
                </h4>
                <p className="text-[11px] text-gray-300">
                  सम्पत्ति र दायित्व पक्ष बराबर भएको (Assets = Liabilities + Equity) प्रमाणित गर्दछ ।
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-300">
              <span>Financial Year: <b>{currentFYName}</b></span>
              <span className="mx-2">•</span>
              <span>As of: <b>{balanceSheetData?.asOfDateBs || todayBS()} BS</b></span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 4: ACCOUNT HEAD LEDGER ───────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Head Selector Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs no-print">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLedgerType('EXPENSE');
                  setSelectedLedgerHeadId(expenseHeads?.[0]?.id?.toString() || '');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition ${
                  ledgerType === 'EXPENSE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Expense Head (खर्च शीर्षक)
              </button>

              <button
                type="button"
                onClick={() => {
                  setLedgerType('INCOME');
                  setSelectedLedgerHeadId(incomeHeads?.[0]?.id?.toString() || '');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition ${
                  ledgerType === 'INCOME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Income Head (आम्दानी शीर्षक)
              </button>
            </div>

            <div className="flex-1 min-w-[240px]">
              <SearchableSelect
                placeholder={`-- Select ${ledgerType === 'EXPENSE' ? 'Expense' : 'Income'} Head --`}
                value={selectedLedgerHeadId}
                onChange={(val) => setSelectedLedgerHeadId(val)}
                options={(ledgerType === 'EXPENSE' ? expenseHeads : incomeHeads).map((h: any) => ({
                  value: h.id.toString(),
                  label: h.name,
                  sublabel: h.nameNepali || h.category?.name,
                  code: h.code,
                }))}
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <span>
                  Ledger Statement: {(ledgerType === 'EXPENSE' ? expenseHeads : incomeHeads).find((h: any) => h.id.toString() === selectedLedgerHeadId)?.name || 'Please select an account head'}
                </span>
              </h3>
              <span className="text-xs text-blue-200 font-mono">
                {ledgerEntries.length} Transactions Recorded
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-gray-800 font-extrabold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-12 text-center">S.N.</th>
                  <th className="p-3 w-28">Date (BS)</th>
                  <th className="p-3 w-28 font-mono">Voucher No</th>
                  <th className="p-3">Particulars (विवरण)</th>
                  <th className="p-3 w-24">Medium</th>
                  <th className="p-3 text-right w-32">Debit (Dr. रू)</th>
                  <th className="p-3 text-right w-32">Credit (Cr. रू)</th>
                  <th className="p-3 text-right w-36">Running Balance (रू)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No ledger transactions found for this head in {currentFYName}.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((row: any) => (
                    <tr key={row.sn} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono text-gray-400">{row.sn}</td>
                      <td className="p-3 font-mono font-bold text-gray-800">{row.dateBs}</td>
                      <td className="p-3 font-mono font-bold text-[#1e3a5f]">{row.voucherNo}</td>
                      <td className="p-3">
                        <strong className="text-gray-900">{row.particulars}</strong>
                        {row.paidFrom && <span className="text-[10px] text-gray-400 block font-mono">Paid from: {row.paidFrom}</span>}
                        {row.depositedIn && <span className="text-[10px] text-gray-400 block font-mono">Deposited in: {row.depositedIn}</span>}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 font-mono">
                          {row.paymentMedium || 'CASH'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">
                        {row.dr > 0 ? `रू ${row.dr.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {row.cr > 0 ? `रू ${row.cr.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-[#1e3a5f] bg-slate-50">
                        रू {row.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ledgerEntries.length > 0 && (
                <tfoot className="bg-[#1e3a5f] text-white font-extrabold">
                  <tr>
                    <td colSpan={7} className="p-3 text-right uppercase tracking-wider text-xs">
                      Closing Head Balance (अन्तिम खाता ब्यालेन्स):
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300 text-sm">
                      रू {ledgerEntries[ledgerEntries.length - 1]?.balance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TAB 4: PARTY LEDGER ──────────────────────────── */}
      {activeTab === 'party_ledger' && (
        <div className="space-y-4">
          {/* Party Selector */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs no-print flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-bold text-gray-700 mb-1">Select Party / Vendor (पार्टी/सप्लायर छनौट गर्नुहोस्)</label>
              <SearchableSelect
                placeholder="-- Select Registered Party --"
                value={selectedPartyId}
                onChange={(val) => setSelectedPartyId(val)}
                options={parties.map((p: any) => ({
                  value: p.id.toString(),
                  label: p.name,
                  sublabel: p.partyType ? `${p.partyType} • ${p.phone || ''}` : p.phone,
                }))}
              />
            </div>
            {selectedPartyObj && (
              <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-[#1e3a5f]">{selectedPartyObj.name}</span>
                {selectedPartyObj.nameNepali && <span className="text-gray-500 font-nepali ml-1.5">({selectedPartyObj.nameNepali})</span>}
                <div className="flex gap-3 text-[11px] text-gray-500 mt-1 font-mono">
                  <span>Type: <b>{selectedPartyObj.partyType || 'VENDOR'}</b></span>
                  {selectedPartyObj.panNo && <span>PAN: <b>{selectedPartyObj.panNo}</b></span>}
                  {selectedPartyObj.phone && <span>Phone: <b>{selectedPartyObj.phone}</b></span>}
                </div>
              </div>
            )}
          </div>

          {/* Party Ledger Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <span>
                  Party Ledger Account: {selectedPartyObj?.name || 'Please select a party'}
                </span>
              </h3>
              <span className="text-xs font-mono font-bold bg-blue-900/70 px-2.5 py-0.5 rounded text-blue-200">
                Total Payments: रू {totalPaidToParty.toLocaleString()}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-gray-800 font-extrabold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-12 text-center">S.N.</th>
                  <th className="p-3 w-28">Date (BS)</th>
                  <th className="p-3 w-28 font-mono">Bill No</th>
                  <th className="p-3">Topic / Head</th>
                  <th className="p-3">Description / Narration</th>
                  <th className="p-3 text-right w-36">Paid Amount (रू)</th>
                  <th className="p-3 text-right w-40">Cumulative Total (रू)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {partyLedgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      {selectedPartyId
                        ? 'No transactions found for this party in the selected period.'
                        : 'Please select a party/vendor above to view their statement.'}
                    </td>
                  </tr>
                ) : (
                  partyLedgerEntries.map((row: any) => (
                    <tr key={row.sn} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-mono text-gray-400">{row.sn}</td>
                      <td className="p-3 font-mono font-bold text-gray-800">{row.dateBs}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{row.billNo}</td>
                      <td className="p-3 font-bold text-gray-900">{row.head}</td>
                      <td className="p-3 text-gray-600">{row.particulars}</td>
                      <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                        रू {row.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-[#1e3a5f] bg-slate-50">
                        रू {row.runningTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {partyLedgerEntries.length > 0 && (
                <tfoot className="bg-[#1e3a5f] text-white font-extrabold">
                  <tr>
                    <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-xs">
                      Total Disbursed to Party (कुल भुक्तानी रकम):
                    </td>
                    <td colSpan={2} className="p-3 text-right font-mono text-emerald-300 text-sm">
                      रू {totalPaidToParty.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Signature Box in Print */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-xs font-bold text-gray-800 text-center">
        <div className="border-t border-gray-400 pt-2">
          <span>Prepared By (लेखापाल)</span>
        </div>
        <div className="border-t border-gray-400 pt-2">
          <span>Internal Auditor (जाँच गर्ने)</span>
        </div>
        <div className="border-t border-gray-400 pt-2">
          <span>Headmaster / Approved (प्रधानाध्यापक)</span>
        </div>
      </div>
    </div>
  );
}
