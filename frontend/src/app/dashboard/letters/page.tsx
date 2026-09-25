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
  Type,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const FONTS = [
  { id: 'devanagari', name: 'Standard Nepali (Devanagari Unicode)', css: '"Noto Sans Devanagari", "Kalimati", sans-serif' },
  { id: 'kalimati', name: 'Traditional Kalimati (कालिमाटी)', css: '"Kalimati", "Noto Sans Devanagari", serif' },
  { id: 'preeti', name: 'Preeti Style Serif (प्रीति फन्ट शैली)', css: '"Preeti", "Times New Roman", serif' },
  { id: 'kantipur', name: 'Kantipur Bold (कान्तिपुर शैली)', css: '"Kantipur", "Noto Sans Devanagari", sans-serif' },
];

export default function SchoolLettersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'composer' | 'register'>('composer');
  const [search, setSearch] = useState('');

  // Styling Customizer State
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [fontSize, setFontSize] = useState<number>(15);
  const [lineHeight, setLineHeight] = useState<number>(2.0);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Form State
  const [letterForm, setLetterForm] = useState({
    chalaniNo: `चलानी-२०८३/०१`,
    patraSankhya: '२०८३/०८४',
    letterDateBs: todayBS(),
    schoolNameNe: 'श्री नेपाल माध्यमिक विद्यालय विश्रामपुर',
    schoolSubtitleNe: 'वृन्दावन न.पा.-२, रौतहट',
    schoolEstdNe: '(स्थापित-२००७ साल)',
    schoolNameEn: 'SHREE NEPAL SECONDARY SCHOOL BISHRAMPUR',
    schoolSubtitleEn: 'Brindawan Municipality -2, Rautahat',
    schoolEstdEn: 'Estd: 2007',
    recipient: 'श्रीमान् शिक्षा विकास तथा समन्वय इकाई प्रमुख,\nरौतहट, गौर।',
    subject: 'कक्षा ११ र १२ को नियमित पठनपाठन सञ्चालन सम्बन्धमा।',
    salutation: '',
    body: `यस विद्यालयमा अध्ययनरत कक्षा ११ र १२ का सम्पूर्ण विद्यार्थी तथा अभिभावकहरूलाई जानकारी गराइन्छ कि मिति २०८३-०३-१७ गते बिहान ६ बजेदेखि कक्षा ११ र १२ को नियमित पठनपाठन सञ्चालन हुने भएकाले सबै विद्यार्थीहरू विद्यालय पोसाकमा समयमै उपस्थित भई नियमित रूपमा कक्षामा सहभागी हुन अनुरोध गरिन्छ।\n\nअनुपस्थित हुने विद्यार्थी स्वयं जिम्मेवार हुने व्यहोरा समेत जानकारी गराइन्छ।`,
    signatoryName: 'प्रेमलाल प्रसाद राउत',
    signatoryRole: 'प्रधानाध्यापक',
    signatorySchool: 'श्री नेपाल मा. वि.',
    signatoryAddress: 'विश्रामपुर, रौतहट',
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

  const activeFontCss = FONTS.find((f) => f.id === selectedFont)?.css || FONTS[0].css;

  const triggerLetterPrint = (letterObj?: any) => {
    const l = letterObj || letterForm;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNe = l.schoolNameNe || 'श्री नेपाल माध्यमिक विद्यालय विश्रामपुर';
    const subNe = l.schoolSubtitleNe || 'वृन्दावन न.पा.-२, रौतहट';
    const estdNe = l.schoolEstdNe || '(स्थापित-२००७ साल)';
    const schoolEn = l.schoolNameEn || 'SHREE NEPAL SECONDARY SCHOOL BISHRAMPUR';
    const subEn = l.schoolSubtitleEn || 'Brindawan Municipality -2, Rautahat';
    const estdEn = l.schoolEstdEn || 'Estd: 2007';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Letter - ${l.subject}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: ${activeFontCss}; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: #111; 
              font-size: ${fontSize}px; 
              line-height: ${lineHeight}; 
              position: relative;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 320px;
              height: 320px;
              opacity: ${showWatermark ? '0.07' : '0'};
              pointer-events: none;
              z-index: 0;
            }
            .letter-container {
              position: relative;
              z-index: 1;
            }
            .letterhead { 
              position: relative;
              padding-bottom: 10px; 
              margin-bottom: 24px; 
              border-bottom: 2.5px solid #111;
            }
            .emblem-left {
              position: absolute;
              left: 0;
              top: 0;
              width: 75px;
              height: 75px;
              object-fit: contain;
            }
            .emblem-svg {
              width: 72px;
              height: 72px;
            }
            .header-text {
              text-align: center;
              padding-left: 60px;
              padding-right: 20px;
            }
            .school-ne { 
              font-size: 23px; 
              font-weight: 900; 
              color: #111; 
              margin: 0;
              letter-spacing: 0.5px;
            }
            .sub-ne {
              font-size: 13.5px;
              font-weight: bold;
              color: #111;
              margin: 1px 0;
            }
            .estd-ne {
              font-size: 11px;
              font-weight: bold;
              color: #333;
              margin: 0;
            }
            .school-en { 
              font-size: 13.5px; 
              font-weight: 900; 
              color: #111; 
              letter-spacing: 0.8px;
              margin-top: 2px;
              text-transform: uppercase;
              font-family: Arial, sans-serif;
            }
            .sub-en {
              font-size: 11px;
              font-weight: 700;
              color: #222;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .estd-en {
              font-size: 10.5px;
              font-weight: bold;
              color: #333;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .chalani-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 12px;
            }
            .date-row {
              text-align: right;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 25px;
            }
            .recipient-box { 
              font-size: 14.5px; 
              font-weight: bold; 
              margin-bottom: 20px; 
              white-space: pre-line; 
              line-height: 1.6; 
            }
            .subject-box { 
              text-align: center; 
              font-size: 15.5px; 
              font-weight: 900; 
              margin: 25px 0; 
              letter-spacing: 0.3px;
            }
            .salutation { 
              font-weight: bold; 
              margin-bottom: 14px; 
            }
            .letter-body { 
              text-align: justify; 
              text-indent: 45px; 
              font-size: ${fontSize}px; 
              line-height: ${lineHeight}; 
              margin-bottom: 60px; 
              white-space: pre-line; 
            }
            .signatory-box { 
              float: right; 
              text-align: center; 
              min-width: 220px; 
              font-size: 13px; 
              line-height: 1.4;
            }
            .signature-graphic {
              width: 140px;
              height: 45px;
              margin: 0 auto 5px auto;
            }
            .sign-name {
              font-weight: 900;
              font-size: 14px;
              color: #111;
            }
            .sign-role {
              font-size: 13px;
              font-weight: bold;
              color: #1e3a5f;
            }
            .sign-school {
              font-size: 12.5px;
              font-weight: bold;
              color: #1e3a5f;
            }
            .sign-addr {
              font-size: 12px;
              color: #1e3a5f;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="watermark">
            <svg viewBox="0 0 100 100" class="w-full h-full">
              <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#1e3a5f" stroke-width="2"/>
              <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
              <circle cx="50" cy="50" r="22" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
              <path d="M40,55 Q50,45 50,35 Q50,45 60,55 Q50,50 40,55 Z" fill="#1e3a5f"/>
              <path d="M35,62 L50,52 L65,62 L50,58 Z" fill="#1e3a5f"/>
            </svg>
          </div>

          <div class="letter-container">
            <div class="letterhead">
              <div class="emblem-left">
                <svg viewBox="0 0 100 100" class="emblem-svg">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#111" stroke-width="2.5"/>
                  <circle cx="50" cy="50" r="41" fill="none" stroke="#111" stroke-width="1.2"/>
                  <path id="curveTop" d="M 15 50 A 35 35 0 0 1 85 50" fill="none"/>
                  <text font-size="6.5" font-weight="bold" fill="#111" text-anchor="middle">
                    <textPath href="#curveTop" startOffset="50%">श्री नेपाल मा.वि. विश्रामपुर</textPath>
                  </text>
                  <path id="curveBottom" d="M 15 50 A 35 35 0 0 0 85 50" fill="none"/>
                  <text font-size="6.5" font-weight="bold" fill="#111" text-anchor="middle">
                    <textPath href="#curveBottom" startOffset="50%">स्था. २००७ • Estd. 2007</textPath>
                  </text>
                  <!-- Star & Book Center -->
                  <polygon points="50,22 56,36 71,36 59,45 63,59 50,50 37,59 41,45 29,36 44,36" fill="none" stroke="#111" stroke-width="1.5"/>
                  <path d="M42,54 Q50,48 58,54 L58,62 Q50,57 42,62 Z" fill="#111"/>
                </svg>
              </div>

              <div class="header-text">
                <h1 class="school-ne">${schoolNe}</h1>
                <div class="sub-ne">${subNe}</div>
                <div class="estd-ne">${estdNe}</div>
                <div class="school-en">${schoolEn}</div>
                <div class="sub-en">${subEn}</div>
                <div class="estd-en">${estdEn}</div>
              </div>
            </div>

            ${l.chalaniNo ? `
              <div class="chalani-row">
                <div>पत्र संख्या: <strong>${l.patraSankhya || '२०८३/०८४'}</strong></div>
                <div>चलानी नं.: <strong>${l.chalaniNo}</strong></div>
              </div>
            ` : ''}

            <div class="date-row">
              मिति: <strong>${l.letterDateBs || todayBS()}</strong>
            </div>

            <div class="subject-box">
              विषय: ${l.subject}
            </div>

            ${l.recipient ? `<div class="recipient-box">${l.recipient}</div>` : ''}

            ${l.salutation ? `<div class="salutation">${l.salutation}</div>` : ''}

            <div class="letter-body">${l.body}</div>

            <div class="signatory-box">
              <div class="signature-graphic">
                <svg viewBox="0 0 160 50" class="w-full h-full">
                  <path d="M20,38 Q45,10 65,30 T105,25 Q125,12 145,28" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"/>
                  <path d="M50,30 Q65,42 95,35" fill="none" stroke="#111" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="sign-name">${l.signatoryName || 'प्रेमलाल प्रसाद राउत'}</div>
              <div class="sign-role">${l.signatoryRole || 'प्रधानाध्यापक'}</div>
              <div class="sign-school">${l.signatorySchool || 'श्री नेपाल मा. वि.'}</div>
              <div class="sign-addr">${l.signatoryAddress || 'विश्रामपुर, रौतहट'}</div>
            </div>
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
            <span>Official Letterpad System (विद्यालय आधिकारिक लेटरप्याड)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            श्री नेपाल माध्यमिक विद्यालय विश्रामपुरको आधिकारिक लेटरप्याड ढाँचामा पत्राचार, सम्पादन तथा उच्च गुणस्तर A4 प्रिन्ट
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
            <span>Compose Letter (पत्र सम्पादन)</span>
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'register' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Chalani Book (चलानी दर्ता)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: COMPOSER ════════════════════ */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Controls (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Sliders size={16} />
                <span>Letter Editor & Controls (पत्र सम्पादन)</span>
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                स्था. २००७ साल
              </span>
            </div>

            {/* Typography Customizer */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between font-bold text-gray-700">
                <span className="flex items-center gap-1">
                  <Type size={14} className="text-[#1e3a5f]" />
                  <span>Choose Font (फन्ट छनौट):</span>
                </span>
                <span className="text-[10px] font-mono text-gray-500">Size: {fontSize}px</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFont(f.id)}
                    className={`p-2 rounded-lg border text-left transition font-semibold text-[11px] ${
                      selectedFont === f.id
                        ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f] font-bold ring-1 ring-[#1e3a5f]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-slate-100'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Font Size:</span>
                  <input
                    type="range"
                    min="12"
                    max="18"
                    step="0.5"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                    className="w-20 cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-1 font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded border-gray-300 text-[#1e3a5f]"
                  />
                  <span>Watermark</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">पत्र संख्या (Letter No):</label>
                <input
                  type="text"
                  value={letterForm.patraSankhya}
                  onChange={(e) => setLetterForm({ ...letterForm, patraSankhya: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">चलानी नं. (Chalani No):</label>
                <input
                  type="text"
                  value={letterForm.chalaniNo}
                  onChange={(e) => setLetterForm({ ...letterForm, chalaniNo: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">मिति BS (Nepali Date):</label>
              <input
                type="text"
                value={letterForm.letterDateBs}
                onChange={(e) => setLetterForm({ ...letterForm, letterDateBs: e.target.value })}
                className="erp-input font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पत्रको विषय (Subject):</label>
              <input
                type="text"
                value={letterForm.subject}
                onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
                className="erp-input font-bold text-[#1e3a5f]"
                placeholder="विषय: ..."
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पाउने कार्यालय / व्यक्ति (Recipient):</label>
              <textarea
                rows={2}
                value={letterForm.recipient}
                onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
                className="erp-input text-xs leading-relaxed"
                placeholder="श्रीमान् ..."
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">पत्रको मुख्य व्यहोरा (Letter Body Content):</label>
              <textarea
                rows={7}
                value={letterForm.body}
                onChange={(e) => setLetterForm({ ...letterForm, body: e.target.value })}
                className="erp-input text-xs leading-relaxed font-nepali"
                placeholder="व्यहोरा..."
              />
            </div>

            {/* Principal / Signatory Customization */}
            <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-3 space-y-2">
              <span className="font-bold text-gray-800 text-[11px] block">हस्ताक्षरकर्ता विवरण (Signatory):</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">नाम (Principal Name):</label>
                  <input
                    type="text"
                    value={letterForm.signatoryName}
                    onChange={(e) => setLetterForm({ ...letterForm, signatoryName: e.target.value })}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">पद (Designation):</label>
                  <input
                    type="text"
                    value={letterForm.signatoryRole}
                    onChange={(e) => setLetterForm({ ...letterForm, signatoryRole: e.target.value })}
                    className="erp-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => triggerLetterPrint()}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <Printer size={14} className="text-blue-600" />
                <span>Direct Print (प्रिन्ट)</span>
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
          <div
            style={{ fontFamily: activeFontCss }}
            className="lg:col-span-7 rounded-2xl border-2 border-gray-300 bg-white p-12 shadow-xl space-y-5 text-left text-gray-900 min-h-[680px] relative overflow-hidden"
          >
            {/* Watermark Emblem */}
            {showWatermark && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.06] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#1e3a5f" stroke-width="2"/>
                  <circle cx="50" cy="50" r="22" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
                  <path d="M40,55 Q50,45 50,35 Q50,45 60,55 Q50,50 40,55 Z" fill="#1e3a5f"/>
                </svg>
              </div>
            )}

            {/* School Header Matching exact image 1 */}
            <div className="relative border-b-2 border-black pb-3">
              {/* Left Circular Emblem */}
              <div className="absolute left-0 top-0 w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#111" stroke-width="2.5"/>
                  <circle cx="50" cy="50" r="41" fill="none" stroke="#111" stroke-width="1.2"/>
                  <path id="previewCurveTop" d="M 15 50 A 35 35 0 0 1 85 50" fill="none"/>
                  <text font-size="6.5" font-weight="bold" fill="#111" text-anchor="middle">
                    <textPath href="#previewCurveTop" startOffset="50%">श्री नेपाल मा.वि. विश्रामपुर</textPath>
                  </text>
                  <path id="previewCurveBottom" d="M 15 50 A 35 35 0 0 0 85 50" fill="none"/>
                  <text font-size="6.5" font-weight="bold" fill="#111" text-anchor="middle">
                    <textPath href="#previewCurveBottom" startOffset="50%">स्था. २००७ • Estd. 2007</textPath>
                  </text>
                  <polygon points="50,22 56,36 71,36 59,45 63,59 50,50 37,59 41,45 29,36 44,36" fill="none" stroke="#111" stroke-width="1.5"/>
                  <path d="M42,54 Q50,48 58,54 L58,62 Q50,57 42,62 Z" fill="#111"/>
                </svg>
              </div>

              {/* Center Typography */}
              <div className="text-center pl-16 pr-4 space-y-0.5">
                <h2 className="text-xl font-black text-gray-950 tracking-tight">
                  {letterForm.schoolNameNe}
                </h2>
                <p className="text-xs font-bold text-gray-900">
                  {letterForm.schoolSubtitleNe}
                </p>
                <p className="text-[10px] font-bold text-gray-700">
                  {letterForm.schoolEstdNe}
                </p>
                <h3 className="text-xs font-black text-gray-950 tracking-wider uppercase font-sans mt-1">
                  {letterForm.schoolNameEn}
                </h3>
                <p className="text-[10px] font-bold text-gray-800 font-sans">
                  {letterForm.schoolSubtitleEn}
                </p>
                <p className="text-[9px] font-bold text-gray-700 font-sans">
                  {letterForm.schoolEstdEn}
                </p>
              </div>
            </div>

            {/* Date Bar on Right */}
            <div className="text-right text-xs font-bold text-gray-800 pt-2">
              मिति: <span className="font-mono font-black">{letterForm.letterDateBs}</span>
            </div>

            {/* Subject Centered Bold */}
            <div className="text-center font-black text-sm md:text-base text-gray-950 my-4 tracking-wide">
              विषय: {letterForm.subject}
            </div>

            {/* Recipient if filled */}
            {letterForm.recipient && (
              <div className="text-xs font-bold text-gray-900 whitespace-pre-line leading-relaxed">
                {letterForm.recipient}
              </div>
            )}

            {/* Salutation */}
            {letterForm.salutation && (
              <div className="font-bold text-xs text-gray-800">
                {letterForm.salutation}
              </div>
            )}

            {/* Letter Body */}
            <div
              style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
              className="text-gray-900 text-justify indent-10 whitespace-pre-line leading-relaxed"
            >
              {letterForm.body}
            </div>

            {/* Signatory Footer Right */}
            <div className="pt-10 flex justify-end">
              <div className="text-center w-56 space-y-0.5">
                <div className="h-9 flex items-center justify-center">
                  <svg viewBox="0 0 160 40" className="w-32 h-8">
                    <path d="M20,28 Q45,5 65,22 T105,18 Q125,8 145,20" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"/>
                  </svg>
                </div>
                <p className="font-black text-xs text-gray-950">
                  {letterForm.signatoryName}
                </p>
                <p className="text-[11px] font-bold text-[#1e3a5f]">{letterForm.signatoryRole}</p>
                <p className="text-[11px] font-bold text-[#1e3a5f]">{letterForm.signatorySchool}</p>
                <p className="text-[10px] text-[#1e3a5f]">{letterForm.signatoryAddress}</p>
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
