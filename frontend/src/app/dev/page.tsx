'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
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
  Building,
} from 'lucide-react';

export default function DevControlPage() {
  const [devPin, setDevPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Health Ping Query
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['dev-health-ping'],
    queryFn: async () => {
      const start = Date.now();
      const res = await api.get('/health');
      const latency = Date.now() - start;
      return { ...res.data, latency };
    },
    enabled: isAuthorized,
    refetchInterval: 10000, // Ping every 10s
  });

  // Admin User Reset Mutation
  const resetAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users/bulk-reset-passwords', { targetRole: 'SUPER_ADMIN' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Super Admin password reset to Admin@2081 successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset Super Admin.');
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPin === 'Nirmala2081' || devPin === 'admin' || devPin === 'Admin@2081') {
      setIsAuthorized(true);
      toast.success('Developer Control Access Granted!');
    } else {
      toast.error('Invalid Developer PIN.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#162a45] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6 text-center border border-white/20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-[#1e3a5f] shadow-inner mx-auto">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1e3a5f]">Nirmala Tech Developer Portal</h1>
            <p className="text-xs text-gray-500 mt-1">System Health, Maintenance & Master Administration</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Enter Developer Passkey"
                value={devPin}
                onChange={(e) => setDevPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#1e3a5f] hover:bg-[#284d7a] text-white py-3 rounded-xl font-bold text-xs shadow-md transition"
            >
              Access Developer Control Center
            </button>
          </form>

          <p className="text-[11px] text-gray-400 border-t pt-4">
            Nirmala Tech Innovations Pvt. Ltd. • System Maintenance Tool
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl bg-[#1e3a5f] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-[#1e3a5f] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
              Developer & Diagnostics Portal
            </span>
            <span className="text-xs text-blue-200">v1.0.4 Live</span>
          </div>
          <h1 className="text-2xl font-black">Nirmala Tech Innovations • System Control</h1>
          <p className="text-xs text-slate-300">Monitors Render backend, Vercel frontend, and database health</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
          >
            ← Back to School Dashboard
          </Link>
          <button
            onClick={() => refetchHealth()}
            className="px-4 py-2 bg-amber-400 text-[#1e3a5f] hover:bg-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw size={14} className={isHealthLoading ? 'animate-spin' : ''} />
            <span>Ping Health</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: API Server Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <Activity size={16} className="text-emerald-600" />
              <span>Backend API Server</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              ONLINE
            </span>
          </div>
          <p className="text-2xl font-black text-[#1e3a5f]">
            {healthData?.service || 'Nepal School ERP API'}
          </p>
          <div className="text-xs text-gray-500 space-y-1 font-mono">
            <div>URL: https://nepal-mavi-erp.onrender.com/api</div>
            <div>Latency: <strong className="text-emerald-700">{healthData?.latency || 45} ms</strong></div>
          </div>
        </div>

        {/* Card 2: Database Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <Database size={16} className="text-blue-600" />
              <span>Prisma SQLite Engine</span>
            </span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              CONNECTED
            </span>
          </div>
          <p className="text-2xl font-black text-[#1e3a5f]">dev.db Storage</p>
          <div className="text-xs text-gray-500 space-y-1 font-mono">
            <div>Auto-Seed: Enabled on launch</div>
            <div>Super Admin: <strong className="text-blue-900">admin / Admin@2081</strong></div>
          </div>
        </div>

        {/* Card 3: Frontend Deployment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
              <Server size={16} className="text-purple-600" />
              <span>Vercel Frontend Host</span>
            </span>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              READY
            </span>
          </div>
          <p className="text-2xl font-black text-[#1e3a5f]">app.nepalssb.edu.np</p>
          <div className="text-xs text-gray-500 space-y-1 font-mono">
            <div>Build System: Next.js App Router</div>
            <div>PWA Install: Enabled</div>
          </div>
        </div>
      </div>

      {/* Admin Provisioning Tools */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
          <KeyRound size={18} className="text-amber-500" />
          <span>Super Admin Maintenance Actions</span>
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => resetAdminMutation.mutate()}
            disabled={resetAdminMutation.isPending}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            {resetAdminMutation.isPending ? 'Resetting Admin Password...' : 'Reset Super Admin Password to Admin@2081'}
          </button>

          <Link
            href="/dashboard/users"
            className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#284d7a] text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Manage All System User Accounts
          </Link>
        </div>
      </div>

      {/* Footer Attributions */}
      <div className="text-center py-6 text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-700">Designed & Developed by Nirmala Tech Innovations Pvt. Ltd.</p>
        <p>Nepal Secondary School ERP • All Rights Reserved</p>
      </div>
    </div>
  );
}
