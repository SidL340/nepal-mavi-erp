'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBSFormatted } from '@/lib/nepali-date';
import {
  Users,
  GraduationCap,
  TrendingUp,
  Wallet,
  UserX,
  BookOpen,
  Calendar,
  Bell,
  ArrowUpRight,
  School,
  FileSpreadsheet,
  Receipt,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      router.replace('/teacher');
    } else if (user?.role === 'STUDENT') {
      router.replace('/student');
    }
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/school/dashboard');
      return res.data?.data;
    },
    enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT',
  });

  const { data: execSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: async () => {
      const todayBs = todayBSFormatted();
      const res = await api.get('/finance-reports/executive-summary', { params: { todayBs } });
      return res.data?.data;
    },
    enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT',
  });

  if (user?.role === 'TEACHER' || user?.role === 'STUDENT') {
    return (
      <div className="py-20 text-center text-gray-400">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
        <p className="mt-3 text-xs font-semibold">Redirecting to your Portal...</p>
      </div>
    );
  }

  const studentsTotal = data?.students?.total ?? 0;
  const teachersTotal = data?.teachers?.total ?? 0;
  const rastriyaTeachers = data?.teachers?.rastriya ?? 0;
  const nijiTeachers = data?.teachers?.nijiSroth ?? 0;
  const totalIncome = data?.finance?.income ?? 0;
  const totalExpense = data?.finance?.expense ?? 0;
  const balance = data?.finance?.balance ?? 0;
  const overdueIssues = data?.library?.overdueIssues ?? 0;

  // Executive summary metrics
  const feesToday = execSummary?.feeCollection?.today ?? 0;
  const feesTodayCount = execSummary?.feeCollection?.todayCount ?? 0;
  const feesMonth = execSummary?.feeCollection?.thisMonth ?? 0;
  const feesMonthCount = execSummary?.feeCollection?.thisMonthCount ?? 0;
  const feesYear = execSummary?.feeCollection?.thisFiscalYear ?? 0;

  const activeStudents = execSummary?.students?.activeCount ?? studentsTotal;
  const todayAbsent = execSummary?.students?.todayAbsentCount ?? 0;

  const totalBankBal = execSummary?.balances?.totalBankBalance ?? 0;
  const cashOnHand = execSummary?.balances?.cashOnHand ?? 0;
  const totalReceivables = execSummary?.dues?.totalReceivables ?? 0;
  const totalPayables = execSummary?.dues?.totalPayables ?? 0;
  const netPosition = execSummary?.financialPosition?.netPosition ?? 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-1 text-xs font-semibold text-amber-300 mb-2">
              <Calendar size={13} />
              <span>BS {todayBSFormatted()} | Academic Year: {data?.academicYear?.year || '2081-82'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Nepal School ERP Dashboard
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-xl font-nepali">
              श्री नेपाल माध्यमिक विद्यालय — सम्पूर्ण शैक्षिक, प्रशासनिक, आर्थिक तथा विद्यार्थी व्यवस्थापन
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/students?tab=admission"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-[#1e3a5f] shadow-sm hover:bg-amber-300 transition"
            >
              <Users size={15} />
              <span>New Admission (नयाँ भर्ना)</span>
            </Link>
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition"
            >
              <Calendar size={15} />
              <span>Take Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 1. FEE COLLECTION STATS (TODAY, MONTH, YEAR) ─────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Fee Collection Real-Time Summary (शुल्क संकलन स्थिति)</h2>
              <p className="text-[11px] text-gray-500">आज, यस महिना र चालु आर्थिक वर्षको संकलन विवरण</p>
            </div>
          </div>
          <Link href="/dashboard/finance/fees" className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
            Fee Collection Portal <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Today's Collection */}
          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">आजको संकलन (Today)</span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-900">रू {isSummaryLoading ? '...' : feesToday.toLocaleString()}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{feesTodayCount} रसिद</span>
            </div>
          </div>

          {/* This Month's Collection */}
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">यस महिनाको संकलन (This Month)</span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-black text-indigo-900">रू {isSummaryLoading ? '...' : feesMonth.toLocaleString()}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{feesMonthCount} रसिद</span>
            </div>
          </div>

          {/* This Fiscal Year's Collection */}
          <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">चालु आ.व. संकलन (Fiscal Year)</span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-900">रू {isSummaryLoading ? '...' : feesYear.toLocaleString()}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-nepali">कुल शुल्क</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. KEY ATTENDANCE & STUDENT STATUS + FINANCIAL LIQUIDITY ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students & Absentees */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Students</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{isSummaryLoading ? '...' : activeStudents}</span>
            <span className="text-xs text-gray-500 font-nepali">सक्रिय विद्यार्थी</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-gray-50 pt-2 text-gray-600">
            <span>आज अनुपस्थित: <b className="text-rose-600">{todayAbsent}</b> जना</span>
            <Link href="/dashboard/attendance" className="font-semibold text-blue-600 hover:underline inline-flex items-center">
              Attendance <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Bank & Cash Balances */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Liquid Funds (बैंक + नगद)</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-800">
              रू {isSummaryLoading ? '...' : (totalBankBal + cashOnHand).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-gray-50 pt-2 text-gray-600">
            <span>Bank: <b className="text-gray-900">रू {totalBankBal.toLocaleString()}</b> | Cash: <b className="text-gray-900">रू {cashOnHand.toLocaleString()}</b></span>
          </div>
        </div>

        {/* Receivables & Payables */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Receivables & Payables</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">विद्यार्थी बक्यौता (Receivable):</span>
              <span className="font-bold text-amber-700">रू {totalReceivables.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">पार्टी तिर्नुपर्ने (Payable):</span>
              <span className="font-bold text-rose-700">रू {totalPayables.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-gray-50 pt-2 text-gray-600">
            <Link href="/dashboard/finance/fees" className="text-blue-600 hover:underline">Fee Dues</Link>
            <Link href="/dashboard/finance/expenses" className="text-rose-600 hover:underline">Vendor Bills</Link>
          </div>
        </div>

        {/* Net Financial Position */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Financial Position</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <School size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${netPosition >= 0 ? 'text-purple-950' : 'text-rose-600'}`}>
              रू {isSummaryLoading ? '...' : netPosition.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-gray-50 pt-2 text-gray-600">
            <span>सम्पत्ति - दायित्व शुद्ध स्थिति</span>
            <Link href="/dashboard/finance/reports" className="font-semibold text-purple-700 hover:underline inline-flex items-center">
              Reports <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 3. QUICK ACCESS ACTION HUB ───────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <School className="text-[#1e3a5f]" size={18} />
          <span>Quick Management Actions (शीघ्र कार्यहरू)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <Link
            href="/dashboard/students?tab=admission"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Users size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">New Admission</span>
            <span className="text-[10px] text-gray-400 font-nepali">नयाँ भर्ना</span>
          </Link>

          <Link
            href="/dashboard/classes/routine"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Calendar size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Class Routine</span>
            <span className="text-[10px] text-gray-400 font-nepali">कक्षा रुटिन</span>
          </Link>

          <Link
            href="/dashboard/exams"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Award size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Seat Planning</span>
            <span className="text-[10px] text-gray-400 font-nepali">सिट प्लान/Admit</span>
          </Link>

          <Link
            href="/dashboard/letters"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <FileSpreadsheet size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">School Letterpad</span>
            <span className="text-[10px] text-gray-400 font-nepali">लेटरप्याड/चलानी</span>
          </Link>

          <Link
            href="/dashboard/certificates"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Award size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Certificates</span>
            <span className="text-[10px] text-gray-400 font-nepali">प्रमाणपत्र ढाँचा</span>
          </Link>

          <Link
            href="/dashboard/finance/fees"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Receipt size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Fee Receipt</span>
            <span className="text-[10px] text-gray-400 font-nepali">रसिद काट्ने</span>
          </Link>

          <Link
            href="/dashboard/finance/budget"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Budget Report</span>
            <span className="text-[10px] text-gray-400 font-nepali">वार्षिक/मासिक बजेट</span>
          </Link>

          <Link
            href="/dashboard/finance/payroll"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50/50 transition text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Wallet size={18} />
            </div>
            <span className="text-xs font-bold text-gray-800">Teacher Payroll</span>
            <span className="text-[10px] text-gray-400 font-nepali">तलब एकमुष्ट निकासा</span>
          </Link>
        </div>
      </div>

      {/* ─── ACADEMIC CALENDAR & EVENT SCHEDULE ───────────────────────────── */}
      <AcademicCalendar />

      {/* Overview Grid: Finance & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Flow summary */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Financial Overview (आर्थिक स्थिति)</h2>
              <p className="text-xs text-gray-500">Government budget, student fee and expenditure status</p>
            </div>
            <Link href="/dashboard/finance/income" className="text-xs font-semibold text-[#1e3a5f] hover:underline">
              Full Ledger →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Total Income / Budget</span>
                <span className="text-[10px] rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">जम्मा आम्दानी</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-900 mt-2">रू {totalIncome.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-700 mt-1">Central, Provincial, Local Palika & Fees</p>
            </div>

            <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800">Total Expenditure</span>
                <span className="text-[10px] rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-800">जम्मा खर्च</span>
              </div>
              <p className="text-2xl font-extrabold text-rose-900 mt-2">रू {totalExpense.toLocaleString()}</p>
              <p className="text-[11px] text-rose-700 mt-1">Salary, ICT, Stationery, Maintenance, Events</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1">
              <span>Budget Utilization Rate</span>
              <span>{totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1e3a5f] h-full rounded-full transition-all duration-500"
                style={{ width: `${totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actionable Alerts & System Status */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <span>Alerts & Notifications</span>
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-100 text-xs">
                <BookOpen className="text-amber-700 mt-0.5 shrink-0" size={16} />
                <div>
                  <p className="font-bold text-amber-900">Library Due Reminders</p>
                  <p className="text-amber-800 mt-0.5">
                    {overdueIssues} book(s) past 15-day return threshold.
                  </p>
                  <Link href="/dashboard/library" className="font-bold underline text-amber-900 mt-1 inline-block">
                    View Overdue Books
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs">
                <Calendar className="text-blue-700 mt-0.5 shrink-0" size={16} />
                <div>
                  <p className="font-bold text-blue-900">Academic Calendar</p>
                  <p className="text-blue-800 mt-0.5">
                    Active academic year is {data?.academicYear?.year || '2081-82'}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/dashboard/notices"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5986] text-white text-xs font-bold transition"
            >
              <Bell size={14} />
              <span>Create Announcement / SMS</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
