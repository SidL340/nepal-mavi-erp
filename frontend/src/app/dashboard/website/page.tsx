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
} from 'lucide-react';

export default function WebsiteManagementPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const websiteManageUrl = 'https://nepalssb.edu.np/manage';
  const adminEmail = 'premlalprasadraut@gmail.com';
  const adminPass = '#%Gautam9845';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Top Banner & Quick Credentials Toolbar */}
      <div className="rounded-2xl bg-[#1e3a5f] p-5 text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-[11px] font-bold text-amber-300 mb-1">
              <Globe size={12} />
              <span>Public School Website Portal</span>
            </div>
            <h1 className="text-xl font-extrabold">Website Management (मुख्य वेभसाइट व्यवस्थापन)</h1>
            <p className="text-xs text-blue-200">
              Manage school news, events, notices, and public content directly inside your ERP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Reload Portal</span>
            </button>
            <a
              href={websiteManageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Open in New Tab</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Quick Credentials Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-[#162e4c] p-3 rounded-xl border border-white/10 text-xs">
          {/* Email Quick Copy */}
          <div className="flex items-center justify-between bg-[#1e3a5f] p-2 rounded-lg border border-white/10">
            <div className="min-w-0 flex items-center gap-2">
              <Mail size={14} className="text-amber-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] text-gray-400">Login Email:</p>
                <strong className="text-white font-mono text-[11px] truncate block">{adminEmail}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminEmail, 'Email')}
              className="ml-2 p-1 text-amber-300 hover:text-amber-200 hover:bg-white/10 rounded"
              title="Copy Email"
            >
              <Copy size={14} />
            </button>
          </div>

          {/* Password Quick Copy */}
          <div className="flex items-center justify-between bg-[#1e3a5f] p-2 rounded-lg border border-white/10">
            <div className="min-w-0 flex items-center gap-2">
              <KeyRound size={14} className="text-amber-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] text-gray-400">Password:</p>
                <strong className="text-white font-mono text-[11px] truncate block">{adminPass}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminPass, 'Password')}
              className="ml-2 p-1 text-amber-300 hover:text-amber-200 hover:bg-white/10 rounded"
              title="Copy Password"
            >
              <Copy size={14} />
            </button>
          </div>

          {/* Portal Target URL */}
          <div className="flex items-center justify-between bg-[#1e3a5f] p-2 rounded-lg border border-white/10">
            <div className="min-w-0 flex items-center gap-2">
              <Globe size={14} className="text-amber-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] text-gray-400">Target Address:</p>
                <strong className="text-white font-mono text-[11px] truncate block">nepalssb.edu.np/manage</strong>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
              EMBEDDED
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Main Website Management Iframe */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-2 overflow-hidden">
        <iframe
          key={iframeKey}
          src={websiteManageUrl}
          title="Nepal SSB School Main Website Management"
          className="w-full h-[820px] rounded-xl border-0"
          allow="camera; microphone; clipboard-write; encrypted-media; fullscreen"
        />
      </div>
    </div>
  );
}
