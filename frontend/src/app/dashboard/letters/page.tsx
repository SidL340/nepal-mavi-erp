'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  FileText,
  Printer,
  Plus,
  Search,
  Send,
  Building,
  CheckCircle2,
  X,
  Eye,
  BookOpen,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SchoolLettersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'composer' | 'register'>('composer');
  const [search, setSearch] = useState('');

  // Form State
  const [letterForm, setLetterForm] = useState({
    chalaniNo: `CH-${todayBS().replace(/-/g, '')}-01`,
    patraSankhya: '२०८१/०८२',
    letterDateBs: todayBS(),
    recipient: 'श्रीमान् शिक्षा विकास तथा समन्वय इकाई प्रमुख,\nरौतहट, गौर।',
    subject: 'विद्यार्थी विवरण तथा छात्रवृत्ति कोटा सम्बन्धमा।',
    salutation: 'महोदय,',
    body: `उपरोक्त सम्बन्धमा यस श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहटमा चालु शैक्षिक सत्र २०८१ मा अध्ययनरत छात्र/छात्राहरूको विवरण तथा स्थानीय तहबाट विनियोजित छात्रवृत्ति कोटा सम्बन्धी विवरण यसै पत्रसाथ संलग्न गरी पठाइएको व्यहोरा सादर अनुरोध गरिन्छ।\n\nउक्त विवरण अनुसार आवश्यक कारबाही अगाडि बढाइदिनुहुन हार्दिक अनुरोध गर्दछौं।`,
    signatoryName: 'श्री राजेश कुमार यादव',
    signatoryRole: 'प्रधानाध्यापक (Headmaster)',
    category: 'GENERAL',
  });

  const [selectedLetterForPrint, setSelectedLetterForPrint] = useState<any>(null);

  // Fetch letters register
  const { data: lettersData, isLoading } = useQuery({
    queryKey: ['school-letters', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/letters?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch school info
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Create & Dispatch Letter Mutation
  const createLetterMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/letters', letterForm);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Letter registered in Chalani Book! Chalani No: ${data.data?.chalaniNo}`);
      setSelectedLetterForPrint(data.data);
      queryClient.invalidateQueries({ queryKey: ['school-letters'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch letter');
    },
  });

  const triggerLetterPrint = (letterObj?: any) => {
    const l = letterObj || letterForm;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNameNe = schoolData?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय';
    const schoolNameEn = schoolData?.name || 'SHREE NEPAL SECONDARY SCHOOL';
    const address = schoolData?.address || 'विश्रामपुर, रौतहट (Bishrampur, Rautahat)';
    const emisCode = schoolData?.emisCode || '320160002';
    const estd = schoolData?.estYear || '2025';
    const phone = schoolData?.phone || '98XXXXXXXX';
    const email = schoolData?.email || 'nepalmavi@gmail.com';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Letter - ${l.chalaniNo}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: "Preeti", "Kalimati", "Noto Sans Devanagari", Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 14px; line-height: 1.8; }
            .letterhead { text-align: center; border-bottom: 3px double #1e3a5f; padding-bottom: 12px; margin-bottom: 24px; position: relative; }
            .gov-badge { font-size: 11px; font-weight: bold; color: #475569; }
            .school-ne { font-size: 24px; font-weight: 900; color: #b91c1c; margin: 2px 0; }
            .school-en { font-size: 14px; font-weight: 800; color: #1e3a5f; letter-spacing: 0.5px; }
            .meta-info { font-size: 11px; color: #4b5563; margin-top: 4px; font-family: sans-serif; }
            .logo-left { position: absolute; left: 0; top: 0; width: 60px; height: 60px; }
            .seal-right { position: absolute; right: 0; top: 0; width: 60px; height: 60px; }
            .chalani-bar { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-bottom: 24px; }
            .recipient-box { font-size: 14px; font-weight: bold; margin-bottom: 20px; white-space: pre-line; line-height: 1.6; }
            .subject-box { text-align: center; font-size: 15px; font-weight: 900; margin: 20px 0; text-decoration: underline; }
            .salutation { font-weight: bold; margin-bottom: 12px; }
            .letter-body { text-align: justify; text-indent: 40px; font-size: 14.5px; line-height: 2; margin-bottom: 60px; white-space: pre-line; }
            .signatory-box { float: right; text-align: center; width: 220px; font-size: 13px; }
            .sign-line { border-top: 1px solid #111; padding-top: 6px; font-weight: bold; }
            .footer-line { position: fixed; bottom: 10mm; left: 20mm; right: 20mm; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; padding-top: 4px; font-family: sans-serif; }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div class="gov-badge">नेपाल सरकार • शिक्षा तथा मानव स्रोत विकास केन्द्र</div>
            <div class="school-ne">${schoolNameNe}</div>
            <div class="school-en">${schoolNameEn}</div>
            <div class="meta-info">
              ${address} • EMIS: ${emisCode} • स्थापना: ${estd} वि.सं. • फोन: ${phone} • Email: ${email}
            </div>
          </div>

          <div class="chalani-bar">
            <div>पत्र संख्या: <strong>${l.patraSankhya || '२०८१/०८२'}</strong><br/>चलानी नं.: <strong>${l.chalaniNo}</strong></div>
            <div style="text-align: right;">मिति: <strong>${l.letterDateBs || todayBS()} वि.सं.</strong></div>
          </div>

          <div class="recipient-box">${l.recipient}</div>

          <div class="subject-box">विषय: ${l.subject}</div>

          <div class="salutation">${l.salutation || 'महोदय,'}</div>

          <div class="letter-body">${l.body}</div>

          <div class="signatory-box">
            <div style="height: 45px;"></div>
            <div class="sign-line">
              <div>(${l.signatoryName || 'श्री राजेश कुमार यादव'})</div>
              <div style="color: #4b5563; font-size: 11px;">${l.signatoryRole || 'प्रधानाध्यापक'}</div>
            </div>
          </div>

          <div class="footer-line">
            श्री नेपाल माध्यमिक विद्यालय — आधिकारिक प्रशासनिक पत्राचार तथा चलानी दर्ता प्रणाली
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const letters = lettersData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <FileText className="text-[#1e3a5f]" />
            <span>School Letterpad & Chalani Registry (लेटरप्याड तथा चलानी दर्ता)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            विद्यालयको आधिकारिक लेटरप्याडमा पत्राचार, चलानी नं. दर्ता र उच्च गुणस्तरीय A4 प्रिन्ट
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('composer')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'composer' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Plus size={14} />
            <span>Compose Letter (नयाँ पत्र)</span>
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'register' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Chalani Book (चलानी किताब)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: COMPOSER ════════════════════ */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#1e3a5f] border-b border-gray-100 pb-2 flex items-center gap-2">
              <FileText size={16} />
              <span>Official Letter Details (पत्र विवरण)</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">पत्र संख्या (Patra Sankhya):</label>
                <input
                  type="text"
                  value={letterForm.patraSankhya}
                  onChange={(e) => setLetterForm({ ...letterForm, patraSankhya: e.target.value })}
                  className="erp-input font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">चलानी नं. (Chalani No):</label>
                <input
                  type="text"
                  value={letterForm.chalaniNo}
                  onChange={(e) => setLetterForm({ ...letterForm, chalaniNo: e.target.value })}
                  className="erp-input font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">मिति BS (Letter Date):</label>
              <input
                type="text"
                value={letterForm.letterDateBs}
                onChange={(e) => setLetterForm({ ...letterForm, letterDateBs: e.target.value })}
                className="erp-input font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पाउने कार्यालय / व्यक्ति (Recipient):</label>
              <textarea
                rows={2}
                value={letterForm.recipient}
                onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
                className="erp-input font-nepali text-xs leading-relaxed"
                placeholder="श्रीमान् ..."
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पत्रको विषय (Subject):</label>
              <input
                type="text"
                value={letterForm.subject}
                onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
                className="erp-input font-nepali font-bold"
                placeholder="विषय: ..."
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">सम्बोधन (Salutation):</label>
              <input
                type="text"
                value={letterForm.salutation}
                onChange={(e) => setLetterForm({ ...letterForm, salutation: e.target.value })}
                className="erp-input font-nepali"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पत्रको मुख्य व्यहोरा (Letter Body):</label>
              <textarea
                rows={6}
                value={letterForm.body}
                onChange={(e) => setLetterForm({ ...letterForm, body: e.target.value })}
                className="erp-input font-nepali text-xs leading-relaxed"
                placeholder="व्यहोरा..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">हस्ताक्षरकर्ताको नाम:</label>
                <input
                  type="text"
                  value={letterForm.signatoryName}
                  onChange={(e) => setLetterForm({ ...letterForm, signatoryName: e.target.value })}
                  className="erp-input font-nepali"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">पद / Designation:</label>
                <input
                  type="text"
                  value={letterForm.signatoryRole}
                  onChange={(e) => setLetterForm({ ...letterForm, signatoryRole: e.target.value })}
                  className="erp-input font-nepali"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => triggerLetterPrint()}
                className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition"
              >
                <Printer size={14} />
                <span>Direct Print</span>
              </button>
              <button
                type="button"
                disabled={createLetterMutation.isPending}
                onClick={() => createLetterMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] flex items-center gap-1.5 transition disabled:opacity-60 shadow-xs"
              >
                <Send size={14} />
                <span>{createLetterMutation.isPending ? 'Saving...' : 'Save & Register (चलानी दर्ता)'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Letterhead A4 Paper (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border-2 border-gray-200 bg-white p-10 shadow-lg font-serif space-y-5 text-left text-gray-900 min-h-[600px] relative">
            {/* School Header */}
            <div className="text-center border-b-2 border-[#1e3a5f] pb-3">
              <p className="text-[10px] font-sans font-bold text-gray-500 uppercase tracking-wider">
                नेपाल सरकार • शिक्षा मन्त्रालय
              </p>
              <h2 className="text-xl font-black text-red-700 font-nepali">
                {schoolData?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय'}
              </h2>
              <h3 className="text-xs font-black text-[#1e3a5f] tracking-wide uppercase font-sans">
                {schoolData?.name || 'SHREE NEPAL SECONDARY SCHOOL'}
              </h3>
              <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                विश्रामपुर, रौतहट • EMIS: {schoolData?.emisCode || '320160002'} • स्थापना: {schoolData?.estYear || '2025'} वि.सं.
              </p>
            </div>

            {/* Chalani & Date Bar */}
            <div className="flex justify-between font-sans text-xs font-bold text-gray-700">
              <div>
                <p>पत्र संख्या: <span className="font-mono">{letterForm.patraSankhya}</span></p>
                <p>चलानी नं.: <span className="font-mono">{letterForm.chalaniNo}</span></p>
              </div>
              <div className="text-right">
                <p>मिति: <span className="font-mono">{letterForm.letterDateBs} वि.सं.</span></p>
              </div>
            </div>

            {/* Recipient */}
            <div className="font-nepali text-sm font-bold text-gray-800 whitespace-pre-line leading-relaxed">
              {letterForm.recipient}
            </div>

            {/* Subject */}
            <div className="text-center font-nepali font-black text-base text-gray-900 underline my-3">
              विषय: {letterForm.subject}
            </div>

            {/* Salutation */}
            <div className="font-nepali font-bold text-sm text-gray-800">
              {letterForm.salutation}
            </div>

            {/* Body */}
            <div className="font-nepali text-sm leading-loose text-gray-800 text-justify indent-10 whitespace-pre-line">
              {letterForm.body}
            </div>

            {/* Signatory */}
            <div className="pt-12 flex justify-end">
              <div className="text-center w-56 font-nepali">
                <div className="h-10"></div>
                <p className="border-t border-gray-700 pt-1 font-bold text-sm text-gray-900">
                  {letterForm.signatoryName}
                </p>
                <p className="text-xs text-gray-600">{letterForm.signatoryRole}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: CHALANI BOOK REGISTER ════════════════════ */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Chalani No, Recipient, Subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Registered Letters: <strong>{letters.length}</strong>
            </span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase w-28">चलानी नं.</th>
                  <th className="p-3.5 font-bold uppercase w-24">मिति (BS)</th>
                  <th className="p-3.5 font-bold uppercase">पाउने कार्यालय / व्यक्ति</th>
                  <th className="p-3.5 font-bold uppercase">विषय</th>
                  <th className="p-3.5 font-bold uppercase">हस्ताक्षरकर्ता</th>
                  <th className="p-3.5 font-bold uppercase text-center w-20">प्रिन्ट</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Loading chalani records...
                    </td>
                  </tr>
                ) : letters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No letters registered in Chalani book yet.
                    </td>
                  </tr>
                ) : (
                  letters.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{l.chalaniNo}</td>
                      <td className="p-3.5 font-mono text-gray-600">{l.letterDateBs}</td>
                      <td className="p-3.5 font-medium text-gray-800 max-w-[200px] truncate">{l.recipient}</td>
                      <td className="p-3.5 font-bold text-gray-900 max-w-[250px] truncate">{l.subject}</td>
                      <td className="p-3.5 text-gray-600">{l.signatoryName || 'Principal'}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => triggerLetterPrint(l)}
                          className="rounded-lg p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition"
                          title="Print Letter"
                        >
                          <Printer size={16} />
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
    </div>
  );
}
