'use client';

import React from 'react';
import toast from 'react-hot-toast';
import {
  Globe,
  Copy,
  ExternalLink,
  KeyRound,
  Mail,
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
    <div className="max-w-2xl mx-auto space-y-6 py-6 pb-12">
      {/* Clean Header & Details Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1e3a5f] border border-blue-100 flex items-center justify-center mx-auto shadow-inner">
          <Globe size={32} />
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f]">Public Website Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Official login details for managing <strong>nepalssb.edu.np</strong>
          </p>
        </div>

        {/* Credentials Box */}
        <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left">
          {/* Email */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="text-[#1e3a5f] shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Login Email / Username</p>
                <strong className="text-gray-900 font-mono text-xs truncate block">{adminEmail}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminEmail, 'Email')}
              className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <KeyRound className="text-amber-500 shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Password</p>
                <strong className="text-gray-900 font-mono text-xs truncate block">{adminPass}</strong>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(adminPass, 'Password')}
              className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Direct Action Button */}
        <div className="pt-2">
          <a
            href={websiteManageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1e3a5f] hover:bg-[#284d7a] text-white rounded-2xl font-black text-xs shadow-lg transition"
          >
            <span>Open Website Manage Portal</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
