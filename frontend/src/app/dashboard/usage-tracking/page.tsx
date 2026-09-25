'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import {
  Clock,
  Users,
  Activity,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Globe,
  Radio,
  GraduationCap,
  BookMarked,
  Receipt,
  Shield,
  UserCog,
} from 'lucide-react';

export default function AppUsageTrackingPage() {
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [filterDateBs, setFilterDateBs] = useState<string>('');

  // 1. Fetch Summary & Live Stats (auto-refreshes every 30 seconds)
  const { data: summaryResponse, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['usage-tracking-summary'],
    queryFn: async () => {
      const res = await api.get('/usage-tracking/summary');
      return res.data?.data;
    },
    refetchInterval: 30000, // 30s live poll
  });

  // 2. Fetch Detailed Login Audit Logs
  const { data: logsResponse, isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['usage-tracking-logs', selectedRole, searchQuery, filterDateBs, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (filterDateBs.trim()) params.append('dateBs', filterDateBs.trim());
      params.append('page', String(page));
      params.append('limit', '40');

      const res = await api.get(`/usage-tracking/logs?${params.toString()}`);
      return res.data?.data;
    },
    refetchInterval: 60000,
  });

  const summary = summaryResponse || {};
  const logsList = logsResponse?.logs || [];
  const roleStats = summary.roleStats || {};
  const deviceStats = summary.deviceStats || {};
  const trend = summary.sevenDaysTrend || [];
  const onlineUsers = summary.onlineUsersList || [];

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Admin', icon: Shield };
      case 'TEACHER':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Teacher', icon: GraduationCap };
      case 'STUDENT':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Student', icon: Users };
      case 'LIBRARIAN':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Librarian', icon: BookMarked };
      case 'ACCOUNTANT':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Accountant', icon: Receipt };
      default:
        return { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: role || 'User', icon: UserCog };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 text-emerald-950 px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                <Radio size={12} className="animate-pulse text-emerald-900" />
                <span>Live System Monitoring & Active User Audit</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-blue-100 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                <Calendar size={12} />
                <span>BS {todayBSFormatted()}</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white font-serif">
              प्रयोग अनुगमन तथा सक्रिय लगइन लग (App Usage & Activity)
            </h1>
            <p className="text-xs text-blue-200">
              Real-time tracking of who logged in today, active users online right now, device distribution, and ERP adoption
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              refetchSummary();
              refetchLogs();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-black shadow-xs transition backdrop-blur-xs"
          >
            <RefreshCw size={14} />
            <span>Refresh Telemetry (रिफ्रेस)</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRIC CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Logins Today */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Logins Today (आजका लगइन)</span>
            <Activity size={16} className="text-blue-600" />
          </div>
          <p className="text-3xl font-black font-mono text-[#1e3a5f] mt-1.5">
            {summary.totalLoginsToday ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Total session logins today
          </span>
        </div>

        {/* Unique Users Today */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Active Users Today (सक्रिय प्रयोगकर्ता)</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="text-3xl font-black font-mono text-purple-700 mt-1.5">
            {summary.distinctUsersTodayCount ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Distinct accounts logged in
          </span>
        </div>

        {/* Currently Online */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Currently Online (अहिले अनलाइन)</span>
            <Radio size={16} className="text-emerald-600 animate-pulse" />
          </div>
          <p className="text-3xl font-black font-mono text-emerald-700 mt-1.5">
            {summary.activeUsersOnlineCount ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
            Active in last 15 minutes
          </span>
        </div>

        {/* Total Registered Accounts */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Total User Accounts (जम्मा खाता)</span>
            <ShieldCheck size={16} className="text-amber-600" />
          </div>
          <p className="text-3xl font-black font-mono text-gray-900 mt-1.5">
            {summary.totalRegisteredUsers ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Teachers, students & staff
          </span>
        </div>
      </div>

      {/* ─── 3. ROLE & DEVICE DISTRIBUTION + 7-DAY TREND ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Role Breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="text-blue-600" />
            <span>Today's Logins by Role (भूमिका अनुसार लगइन)</span>
          </h3>

          <div className="space-y-2 text-xs pt-1">
            {[
              { label: 'Students (विद्यार्थीहरू)', count: roleStats.STUDENT || 0, color: 'bg-emerald-500', text: 'text-emerald-700' },
              { label: 'Teachers (शिक्षकहरू)', count: roleStats.TEACHER || 0, color: 'bg-blue-500', text: 'text-blue-700' },
              { label: 'Librarians (पुस्तकालय)', count: roleStats.LIBRARIAN || 0, color: 'bg-purple-500', text: 'text-purple-700' },
              { label: 'Accountants (लेखापाल)', count: roleStats.ACCOUNTANT || 0, color: 'bg-amber-500', text: 'text-amber-700' },
              { label: 'Admins (प्रशासक)', count: roleStats.ADMIN || 0, color: 'bg-rose-500', text: 'text-rose-700' },
            ].map((r) => {
              const total = summary.totalLoginsToday || 1;
              const pct = Math.round((r.count / total) * 100);
              return (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-gray-700">{r.label}</span>
                    <span className={`font-mono ${r.text}`}>{r.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
            <Laptop size={14} className="text-indigo-600" />
            <span>Device Types (उपकरण विवरण)</span>
          </h3>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <Laptop size={20} className="mx-auto text-blue-700" />
              <span className="text-[10px] font-bold text-gray-500 block">Desktop / PC</span>
              <strong className="text-lg font-black text-[#1e3a5f] font-mono">
                {deviceStats.Desktop || 0}
              </strong>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <Smartphone size={20} className="mx-auto text-emerald-700" />
              <span className="text-[10px] font-bold text-gray-500 block">Mobile Phones</span>
              <strong className="text-lg font-black text-emerald-700 font-mono">
                {deviceStats.Mobile || 0}
              </strong>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <Tablet size={20} className="mx-auto text-purple-700" />
              <span className="text-[10px] font-bold text-gray-500 block">Tablets / iPads</span>
              <strong className="text-lg font-black text-purple-700 font-mono">
                {deviceStats.Tablet || 0}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 pt-1 leading-relaxed">
            Mobile usage allows students and parents to check results, routines, and fees on smartphones anytime.
          </p>
        </div>

        {/* 7-Day Trend */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-amber-600" />
            <span>7-Day Login Activity Trend (पछिल्लो ७ दिन)</span>
          </h3>

          <div className="space-y-1.5 pt-1">
            {trend.map((t: any) => {
              const maxLogins = Math.max(...trend.map((x: any) => x.totalLogins), 10);
              const barWidth = Math.max(Math.round((t.totalLogins / maxLogins) * 100), 4);
              return (
                <div key={t.dateStr} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] font-bold text-gray-500 w-12 shrink-0">
                    {t.dayName}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#1e3a5f] w-12 text-right shrink-0">
                    {t.totalLogins} log
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 4. CURRENTLY ONLINE ACTIVE USERS LIVE STRIP ──────────────────────── */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-2">
            <Radio size={14} className="text-emerald-600 animate-pulse" />
            <span>Live Online Users Now ({onlineUsers.length} Active in last 15 mins)</span>
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Auto-Refreshed
          </span>
        </div>

        {onlineUsers.length === 0 ? (
          <p className="text-xs text-emerald-800 italic">No users currently active in the last 15 minutes.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {onlineUsers.map((u: any) => {
              const roleBadge = getRoleBadge(u.role);
              const name = u.teacher?.fullName || u.student?.fullName || u.username;
              const sub = u.teacher?.post || u.student?.classEnrollment?.[0]?.class?.name || u.role;
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-2 bg-white rounded-xl border border-emerald-200 p-2 shadow-2xs"
                >
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center font-black text-xs text-[#1e3a5f]">
                      {u.teacher?.photoUrl || u.student?.photoUrl ? (
                        <img src={u.teacher?.photoUrl || u.student?.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-gray-900 block text-xs leading-tight">{name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`px-1.5 py-0.1 rounded text-[9px] font-black uppercase ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium font-mono">{sub}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 5. AUDIT LOGIN LOGS TABLE & SEARCH ───────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>Login History & Activity Audit Log (सम्पूर्ण लगइन रेकर्ड)</span>
            </h3>
            <p className="text-xs text-gray-500">
              Audit trails of all authentication events, device information, IP addresses, and timestamps
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50"
            >
              <option value="ALL">All Roles (सबै)</option>
              <option value="TEACHER">Teachers (शिक्षक)</option>
              <option value="STUDENT">Students (विद्यार्थी)</option>
              <option value="LIBRARIAN">Librarians (पुस्तकालय)</option>
              <option value="ACCOUNTANT">Accountants (लेखापाल)</option>
              <option value="ADMIN">Admins (प्रशासक)</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search user, name, IP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-slate-50 w-44 focus:w-56 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5">S.N.</th>
                <th className="px-4 py-2.5">User & Account</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-4 py-2.5">Login Time (मिति र समय)</th>
                <th className="px-3.5 py-2.5">Device & Browser</th>
                <th className="px-4 py-2.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLogsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                    <span>Loading login audit trails...</span>
                  </td>
                </tr>
              ) : logsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No login events recorded matching the filter.
                  </td>
                </tr>
              ) : (
                logsList.map((log: any, idx: number) => {
                  const roleBadge = getRoleBadge(log.role);
                  const RoleIcon = roleBadge.icon;
                  const loginDate = new Date(log.loginAt);
                  const timeFormatted = loginDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-3 font-mono text-gray-500">
                        {(page - 1) * 40 + idx + 1}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <strong className="text-gray-900 block font-bold leading-tight">
                          {log.fullName || log.username}
                        </strong>
                        <span className="font-mono text-[10px] text-blue-700 block mt-0.5">
                          @{log.username}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${roleBadge.bg}`}>
                          <RoleIcon size={10} />
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      {/* Login Time */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-800 block">
                          {timeFormatted}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block">
                          {log.loginDateBs || loginDate.toISOString().slice(0, 10)}
                        </span>
                      </td>

                      {/* Device */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          {log.deviceType === 'Mobile' ? (
                            <Smartphone size={13} className="text-emerald-600" />
                          ) : log.deviceType === 'Tablet' ? (
                            <Tablet size={13} className="text-purple-600" />
                          ) : (
                            <Laptop size={13} className="text-blue-600" />
                          )}
                          <span className="font-bold text-gray-700 text-[11px]">
                            {log.deviceType || 'Desktop'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px] block mt-0.5">
                          {log.userAgent}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3 font-mono text-gray-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 inline-block">
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsResponse?.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">
              Page <b>{page}</b> of <b>{logsResponse.totalPages}</b> ({logsResponse.total} total login records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= logsResponse.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
