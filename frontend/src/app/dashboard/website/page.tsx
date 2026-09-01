'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Globe,
  Copy,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Mail,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function WebsiteManagementPage() {
  const websiteManageUrl = 'https://nepalssb.edu.np/manage';
  const adminEmail = 'premlalprasadraut@gmail.com';
  const adminPass = '#%Gautam9845';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="rounded-3xl bg-[#1e3a5f] p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner">
            <Globe size={24} />
          </div>
          <div>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-400/30">
              Main Public Website Portal
            </span>
            <h1 className="text-2xl font-black mt-1">School Website Management</h1>
            <p className="text-xs text-blue-200">
              nepalssb.edu.np • Official Public School Website Control
            </p>
          </div>
        </div>

        {/* Quick Credentials Copy Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#142944] p-4 rounded-2xl border border-white/10">
          {/* Email Box */}
          <div className="flex items-center justify-between bg-[#1e3a5f] p-3 rounded-xl border border-white/10 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="text-amber-400 shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Portal Username / Email</p>
                <strong className="text-white font-mono text-xs truncate block">{adminEmail}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminEmail, 'Email')}
              className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>

          {/* Password Box */}
          <div className="flex items-center justify-between bg-[#1e3a5f] p-3 rounded-xl border border-white/10 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <KeyRound className="text-amber-400 shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Portal Password</p>
                <strong className="text-white font-mono text-xs truncate block">{adminPass}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminPass, 'Password')}
              className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Direct Launch Portal Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1e3a5f] border border-blue-100 flex items-center justify-center mx-auto shadow-inner">
          <Globe size={32} />
        </div>

        <div className="max-w-lg mx-auto space-y-2">
          <h2 className="text-xl font-black text-[#1e3a5f]">Access Main School Website Admin</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Click below to launch the website management portal. Your credentials above have been saved for quick 1-click copying.
          </p>
        </div>

        {/* 1-Click Launch Button */}
        <div className="pt-2">
          <a
            href={websiteManageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition duration-200 group"
          >
            <span>Launch nepalssb.edu.np/manage</span>
            <ExternalLink size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
        </div>

        {/* Embedded Portal Display Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5 max-w-md mx-auto">
          <p className="font-bold text-slate-800 flex items-center justify-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Secure Web Server Security Compliance</span>
          </p>
          <p className="text-[11px] leading-relaxed">
            Because public school domain servers enforce strict <code>SAMEORIGIN</code> security headers against clickjacking, opening directly in your portal tab ensures full compatibility.
          </p>
        </div>
      </div>
    </div>
  );
}
