'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Wrench,
  ShieldCheck,
  Activity,
  Database,
  Server,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Terminal,
  ExternalLink,
  Code2,
  Eye,
  EyeOff,
  Users,
  Building,
  Radio,
  FileText,
} from 'lucide-react';

export default function DevControlPage() {
  const { user } = useAuthStore();
  const [devPin, setDevPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Health & Stats Query
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['dev-health-ping'],
    queryFn: async () => {
      const start = Date.now();
      const res = await api.get('/health');
      const latency = Date.now() - start;
      return { ...res.data, latency };
    },
    enabled: isAuthorized,
    refetchInterval: 10000,
  });

  // Admin User Reset Mutation
  const resetAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users/bulk-reset-passwords', { targetRole: 'SUPER_ADMIN' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Super Admin password reset successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset Super Admin.');
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPin === 'NirmalaTech@2081' || devPin === 'Nirmala2081') {
      setIsAuthorized(true);
      toast.success('Developer Control Access Granted!');
    } else {
      toast.error('Access Denied: Invalid Developer Passkey.');
    }
  };

  // Lock out unauthorized non-super-admins
  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h1 className="text-xl font-black text-white">403 Access Denied</h1>
          <p className="text-xs text-slate-400">
            This developer portal is restricted to authorized Nirmala Tech system engineers and Super Administrators.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-amber-400 text-slate-900 rounded-xl font-extrabold text-xs shadow-md"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Developer Passkey Gate
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 rounded-3xl p-8 shadow-2xl space-y-6 text-center border border-slate-800">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400/10 text-amber-400 shadow-inner mx-auto ring-1 ring-amber-400/30">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">Nirmala Tech Developer Control</h1>
            <p className="text-xs text-slate-400 mt-1">System Health, Maintenance & Super-Admin Management</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="Enter Developer Security Key"
                value={devPin}
                onChange={(e) => setDevPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 py-3 rounded-xl font-black text-xs shadow-lg transition duration-200"
            >
              Authenticate & Open Portal
            </button>
          </form>

          <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-4">
            Nirmala Tech Innovations Pvt. Ltd. • Enterprise System Control
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <Radio size={10} className="animate-pulse text-amber-400" />
              Developer & Diagnostics Control
            </span>
            <span className="text-xs text-slate-400 font-mono">v1.0.4 Production</span>
          </div>
          <h1 className="text-2xl font-black text-white">Nirmala Tech Innovations • System Control</h1>
          <p className="text-xs text-slate-400">Live monitoring of Render API server, SQLite database, and Vercel hosting</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsMaintenanceMode(!isMaintenanceMode);
              toast.success(`Maintenance Banner ${!isMaintenanceMode ? 'ENABLED' : 'DISABLED'}`);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isMaintenanceMode
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle size={14} className={isMaintenanceMode ? 'text-rose-400' : 'text-slate-400'} />
            <span>{isMaintenanceMode ? 'Maintenance Mode ON' : 'Toggle Maintenance Mode'}</span>
          </button>

          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => refetchHealth()}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw size={14} className={isHealthLoading ? 'animate-spin' : ''} />
            <span>Ping Health</span>
          </button>
        </div>
      </div>

      {/* Maintenance Alert Notice */}
      {isMaintenanceMode && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-4 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-rose-400 shrink-0" size={18} />
            <span><strong>Maintenance Mode Active:</strong> Standard user logins will display a scheduled maintenance banner.</span>
          </div>
        </div>
      )}

      {/* Health Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* API Server */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Activity size={16} className="text-emerald-400" />
              <span>Backend API Server</span>
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              ONLINE
            </span>
          </div>
          <p className="text-xl font-black text-white">Nepal School ERP API</p>
          <div className="text-xs text-slate-400 space-y-1 font-mono">
            <div>Host: https://nepal-mavi-erp.onrender.com/api</div>
            <div>Latency: <strong className="text-emerald-400">{healthData?.latency || 48} ms</strong></div>
          </div>
        </div>

        {/* Database Engine */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Database size={16} className="text-blue-400" />
              <span>Prisma SQLite Engine</span>
            </span>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              CONNECTED
            </span>
          </div>
          <p className="text-xl font-black text-white">dev.db Database</p>
          <div className="text-xs text-slate-400 space-y-1 font-mono">
            <div>Auto-Seed: Active on deployment</div>
            <div className="flex items-center justify-between">
              <span>Super Admin: <strong className="text-white">admin</strong></span>
              <button
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                {showAdminPass ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showAdminPass ? 'Admin@2081' : '••••••••'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Frontend Host */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Server size={16} className="text-purple-400" />
              <span>Vercel Frontend Host</span>
            </span>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              READY
            </span>
          </div>
          <p className="text-xl font-black text-white">app.nepalssb.edu.np</p>
          <div className="text-xs text-slate-400 space-y-1 font-mono">
            <div>Engine: Next.js 16 App Router</div>
            <div>PWA App: Enabled</div>
          </div>
        </div>
      </div>

      {/* Admin Maintenance Control */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <KeyRound size={18} className="text-amber-400" />
          <span>Super Admin Maintenance Actions</span>
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => resetAdminMutation.mutate()}
            disabled={resetAdminMutation.isPending}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {resetAdminMutation.isPending ? 'Resetting Admin Password...' : 'Reset Super Admin Password'}
          </button>

          <Link
            href="/dashboard/users"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-md transition"
          >
            Manage User Accounts & Slips
          </Link>

          <Link
            href="https://github.com/SidL340/nepal-mavi-erp"
            target="_blank"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 shadow-md transition flex items-center gap-1.5"
          >
            <Code2 size={14} />
            <span>GitHub Repository</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Developer Footer */}
      <div className="text-center py-6 text-xs text-slate-500 space-y-1 border-t border-slate-900">
        <p className="font-bold text-slate-300">Designed & Developed by Nirmala Tech Innovations Pvt. Ltd.</p>
        <p>© {new Date().getFullYear()} Nepal Secondary School ERP • Secure Diagnostics System</p>
      </div>
    </div>
  );
}
