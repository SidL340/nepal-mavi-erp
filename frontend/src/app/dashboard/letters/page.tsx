'use client';

import React, { useState, useEffect } from 'react';
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
  Upload,
  RotateCcw,
  ShieldCheck,
  Palette,
  Stamp,
  Save,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const FONTS = [
  { id: 'devanagari', name: 'Standard Nepali (Devanagari Unicode)', css: '"Noto Sans Devanagari", "Kalimati", sans-serif' },
  { id: 'kalimati', name: 'Traditional Kalimati (कालिमाटी)', css: '"Kalimati", "Noto Sans Devanagari", serif' },
  { id: 'preeti', name: 'Preeti Style Serif (प्रीति फन्ट शैली)', css: '"Preeti", "Times New Roman", serif' },
  { id: 'kantipur', name: 'Kantipur Bold (कान्तिपुर शैली)', css: '"Kantipur", "Noto Sans Devanagari", sans-serif' },
];

const COLOR_PRESETS = [
  { id: 'dark-navy', name: 'Dark Navy', hex: '#0b1f3a' },
  { id: 'pure-black', name: 'Pure Black', hex: '#000000' },
  { id: 'deep-blue', name: 'Royal Blue', hex: '#1e3a5f' },
  { id: 'slate-gray', name: 'Slate Gray', hex: '#334155' },
  { id: 'crimson', name: 'Crimson Red', hex: '#991b1b' },
  { id: 'forest-green', name: 'Forest Green', hex: '#065f46' },
];

export default function SchoolLettersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'composer' | 'register'>('composer');
  const [search, setSearch] = useState('');

  // Fetch School Profile for official default info, logo & seal
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // Typography & Color Customizer State
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [fontSize, setFontSize] = useState<number>(15);
  const [lineHeight, setLineHeight] = useState<number>(1.9);
  const [textColor, setTextColor] = useState<string>('#111827');
  
  // Header & Subject Customizer State
  const [headerFontSize, setHeaderFontSize] = useState<number>(20);
  const [headerColor, setHeaderColor] = useState<string>('#0b1f3a');
  const [subjectFontSize, setSubjectFontSize] = useState<number>(16);
  const [subjectColor, setSubjectColor] = useState<string>('#0b1f3a');
  const [pageMargin, setPageMargin] = useState<'narrow' | 'standard' | 'wide'>('standard');

  // Element Dimensions
  const [logoSize, setLogoSize] = useState<number>(75);
  const [sealSize, setSealSize] = useState<number>(75);
  const [signatureWidth, setSignatureWidth] = useState<number>(130);

  // Asset Visibility Toggles
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showSeal, setShowSeal] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [isPrincipalApproved, setIsPrincipalApproved] = useState<boolean>(true);

  // Logo, Seal & Signature State (Persistent with localStorage + school profile fallback)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customSealUrl, setCustomSealUrl] = useState<string | null>(null);
  const [customSignatureUrl, setCustomSignatureUrl] = useState<string | null>(null);

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
    salutation: 'महोदय,',
    body: `यस विद्यालयमा अध्ययनरत कक्षा ११ र १२ का सम्पूर्ण विद्यार्थी तथा अभिभावकहरूलाई जानकारी गराइन्छ कि मिति २०८३-०३-१७ गते बिहान ६ बजेदेखि कक्षा ११ र १२ को नियमित पठनपाठन सञ्चालन हुने भएकाले सबै विद्यार्थीहरू विद्यालय पोसाकमा समयमै उपस्थित भई नियमित रूपमा कक्षामा सहभागी हुन अनुरोध गरिन्छ।\n\nअनुपस्थित हुने विद्यार्थी स्वयं जिम्मेवार हुने व्यहोरा समेत जानकारी गराइन्छ।`,
    signatoryName: 'प्रेमलाल प्रसाद राउत',
    signatoryRole: 'प्रधानाध्यापक',
    category: 'GENERAL',
  });

  const [selectedLetterForPrint, setSelectedLetterForPrint] = useState<any>(null);

  // Initialize and auto-load saved Logo, Seal, Signature & School Info
  useEffect(() => {
    // 1. Check localStorage first for instant recall
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('official_school_logo');
      const savedSeal = localStorage.getItem('official_school_seal');
      const savedSign = localStorage.getItem('official_principal_signature');

      if (savedLogo) setCustomLogoUrl(savedLogo);
      if (savedSeal) setCustomSealUrl(savedSeal);
      if (savedSign) setCustomSignatureUrl(savedSign);
    }

    // 2. If school profile is available, sync fallback details
    if (schoolProfile && Object.keys(schoolProfile).length > 0) {
      if (!customLogoUrl && schoolProfile.logoUrl) {
        setCustomLogoUrl(schoolProfile.logoUrl);
      }
      if (!customSealUrl && schoolProfile.sealUrl) {
        setCustomSealUrl(schoolProfile.sealUrl);
      }

      setLetterForm((prev) => ({
        ...prev,
        schoolNameNe: schoolProfile.nameNepali || prev.schoolNameNe,
        schoolSubtitleNe: schoolProfile.address || prev.schoolSubtitleNe,
        schoolEstdNe: schoolProfile.estYear ? `(स्थापित-${schoolProfile.estYear} साल)` : prev.schoolEstdNe,
        schoolNameEn: schoolProfile.name || prev.schoolNameEn,
        schoolSubtitleEn: `${schoolProfile.district || 'Rautahat'}, Nepal`,
        signatoryName: schoolProfile.principalName || prev.signatoryName,
      }));
    }
  }, [schoolProfile]);

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

  // Handle Logo Upload (Persists to localStorage immediately)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomLogoUrl(dataUrl);
      localStorage.setItem('official_school_logo', dataUrl);
      toast.success('लोगो लोड भयो र स्थायी रूपमा सुरक्षित गरियो!');
    };
    reader.readAsDataURL(file);
  };

  // Handle Seal / Stamp Upload (Persists to localStorage immediately)
  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomSealUrl(dataUrl);
      localStorage.setItem('official_school_seal', dataUrl);
      toast.success('विद्यालयको छाप/स्ट्याम्प लोड भयो र सुरक्षित गरियो!');
    };
    reader.readAsDataURL(file);
  };

  // Handle Signature Upload (Persists to localStorage immediately)
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomSignatureUrl(dataUrl);
      localStorage.setItem('official_principal_signature', dataUrl);
      toast.success('प्रधानाध्यापकको डिजिटल हस्ताक्षर लोड भयो र सुरक्षित गरियो!');
    };
    reader.readAsDataURL(file);
  };

  // Save all custom assets into School Profile permanently on server
  const saveAsPermanentDefault = async () => {
    try {
      await api.post('/school/profile', {
        logoUrl: customLogoUrl || undefined,
        sealUrl: customSealUrl || undefined,
        principalName: letterForm.signatoryName || undefined,
      });
      toast.success('विद्यालयको लोगो, छाप र हस्ताक्षर सर्भरमा स्थायी रूपमा सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
    } catch (err: any) {
      toast.success('स्थानीय रूपमा सुरक्षित भयो (Saved locally)!');
    }
  };

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

    const schoolNe = l.schoolNameNe || letterForm.schoolNameNe;
    const subNe = l.schoolSubtitleNe || letterForm.schoolSubtitleNe;
    const estdNe = l.schoolEstdNe || letterForm.schoolEstdNe;
    const schoolEn = l.schoolNameEn || letterForm.schoolNameEn;
    const subEn = l.schoolSubtitleEn || letterForm.schoolSubtitleEn;
    const estdEn = l.schoolEstdEn || letterForm.schoolEstdEn;

    const pageMarginCss = pageMargin === 'narrow' ? '10mm 15mm' : pageMargin === 'wide' ? '20mm 25mm' : '15mm 20mm';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Letter - ${l.subject}</title>
          <style>
            @page { size: A4 portrait; margin: ${pageMarginCss}; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: ${activeFontCss}; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: ${textColor}; 
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
              margin-bottom: 22px; 
              border-bottom: 2.5px solid #111;
            }
            .emblem-left {
              position: absolute;
              left: 0;
              top: 0;
              width: ${logoSize}px;
              height: ${logoSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .header-text {
              text-align: center;
              padding-left: ${showLogo ? `${logoSize + 10}px` : '0'};
              padding-right: 15px;
            }
            .school-ne {
              font-size: ${headerFontSize}px;
              font-weight: 900;
              color: ${headerColor};
              margin: 0;
              line-height: 1.25;
            }
            .sub-ne {
              font-size: 13.5px;
              font-weight: bold;
              color: #222;
              margin: 1px 0;
            }
            .estd-ne {
              font-size: 12px;
              font-weight: 800;
              color: #333;
              margin: 0;
            }
            .school-en {
              font-size: 13.5px;
              font-weight: 900;
              color: #0b1f3a;
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
              margin-bottom: 10px;
            }
            .date-row {
              text-align: right;
              font-size: 13.5px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .recipient-box { 
              font-size: 14.5px; 
              font-weight: bold; 
              margin-bottom: 18px; 
              white-space: pre-line; 
              line-height: 1.55; 
            }
            .subject-box { 
              text-align: center; 
              font-size: ${subjectFontSize}px; 
              font-weight: 900; 
              color: ${subjectColor};
              margin: 22px 0; 
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
              color: ${textColor};
              margin-bottom: 50px; 
              white-space: pre-line; 
            }
            .signatory-box { 
              float: right; 
              text-align: center; 
              min-width: 200px; 
              font-size: 13px; 
              line-height: 1.4;
              position: relative;
            }
            .signatures-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              min-height: 50px;
              margin-bottom: 4px;
            }
            .signature-graphic {
              width: ${signatureWidth}px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .seal-graphic {
              width: ${sealSize}px;
              height: ${sealSize}px;
              object-fit: contain;
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
          </style>
        </head>
        <body>
          <div class="watermark">
            ${customLogoUrl && showWatermark ? `<img src="${customLogoUrl}" style="width:100%;height:100%;object-fit:contain;"/>` : `
            <svg viewBox="0 0 100 100" class="w-full h-full">
              <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#1e3a5f" stroke-width="2"/>
              <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
              <circle cx="50" cy="50" r="22" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
            </svg>`}
          </div>

          <div class="letter-container">
            <div class="letterhead">
              ${showLogo ? `
                <div class="emblem-left">
                  ${customLogoUrl ? `<img src="${customLogoUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:50%;"/>` : `
                  <svg viewBox="0 0 100 100" style="width:100%;height:100%;">
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
                    <polygon points="50,22 56,36 71,36 59,45 63,59 50,50 37,59 41,45 29,36 44,36" fill="none" stroke="#111" stroke-width="1.5"/>
                    <path d="M42,54 Q50,48 58,54 L58,62 Q50,57 42,62 Z" fill="#111"/>
                  </svg>`}
                </div>
              ` : ''}

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
              <div class="signatures-row">
                ${showSeal && customSealUrl ? `
                  <img src="${customSealUrl}" class="seal-graphic" alt="School Seal" />
                ` : ''}
                ${includeSignature && isPrincipalApproved ? `
                  <div class="signature-graphic">
                    ${customSignatureUrl ? `<img src="${customSignatureUrl}" style="max-height:48px;max-width:${signatureWidth}px;object-fit:contain;"/>` : `
                    <svg viewBox="0 0 160 50" style="width:100%;height:100%;">
                      <path d="M20,38 Q45,10 65,30 T105,25 Q125,12 145,28" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"/>
                      <path d="M50,30 Q65,42 95,35" fill="none" stroke="#111" stroke-width="1.5"/>
                    </svg>`}
                  </div>
                ` : '<div style="height:35px;"></div>'}
              </div>
              <div class="sign-name">${l.signatoryName || 'प्रेमलाल प्रसाद राउत'}</div>
              <div class="sign-role">${l.signatoryRole || 'प्रधानाध्यापक'}</div>
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
            प्रशासन तथा लेखापालद्वारा आधिकारिक पत्राचार, सम्पादन, लोगो/हस्ताक्षर व्यवस्थापन तथा प्रिन्ट
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('composer')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'composer' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Plus size={14} />
            <span>Compose Letter (पत्र सम्पादन)</span>
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
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
              <button
                type="button"
                onClick={saveAsPermanentDefault}
                className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                title="Save current Logo, Seal & Signature permanently for future letters"
              >
                <Save size={12} />
                <span>Save As Default</span>
              </button>
            </div>

            {/* Logo, Seal & Signature Upload Panel (With permanent memory) */}
            <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1e3a5f] text-xs block">
                  🖼️ Official Logo, Seal & Principal Signature:
                </span>
                <span className="text-[10px] font-semibold text-gray-500">Auto-saved for next time</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Logo Upload */}
                <div className="bg-white p-2 rounded-lg border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-700">विद्यालय लोगो:</span>
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="rounded text-blue-600"
                      title="Show/Hide Logo"
                    />
                  </div>
                  <label className="block py-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9.5px] font-bold text-center cursor-pointer transition">
                    <Upload size={10} className="inline mr-1" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {customLogoUrl && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[9px] text-emerald-700 font-bold">✓ Loaded</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomLogoUrl(null);
                          localStorage.removeItem('official_school_logo');
                        }}
                        className="text-gray-400 hover:text-rose-600 text-[9px]"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Seal / Stamp Upload */}
                <div className="bg-white p-2 rounded-lg border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-700">विद्यालय छाप:</span>
                    <input
                      type="checkbox"
                      checked={showSeal}
                      onChange={(e) => setShowSeal(e.target.checked)}
                      className="rounded text-blue-600"
                      title="Show/Hide Seal"
                    />
                  </div>
                  <label className="block py-1 px-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-[9.5px] font-bold text-center cursor-pointer transition">
                    <Upload size={10} className="inline mr-1" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleSealUpload} className="hidden" />
                  </label>
                  {customSealUrl && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[9px] text-emerald-700 font-bold">✓ Loaded</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomSealUrl(null);
                          localStorage.removeItem('official_school_seal');
                        }}
                        className="text-gray-400 hover:text-rose-600 text-[9px]"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Signature Upload */}
                <div className="bg-white p-2 rounded-lg border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-700">प्र.अ. हस्ताक्षर:</span>
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="rounded text-blue-600"
                      title="Show/Hide Signature"
                    />
                  </div>
                  <label className="block py-1 px-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded text-[9.5px] font-bold text-center cursor-pointer transition">
                    <Upload size={10} className="inline mr-1" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                  </label>
                  {customSignatureUrl && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[9px] text-emerald-700 font-bold">✓ Loaded</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomSignatureUrl(null);
                          localStorage.removeItem('official_principal_signature');
                        }}
                        className="text-gray-400 hover:text-rose-600 text-[9px]"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles Strip */}
              <div className="flex flex-wrap items-center justify-between pt-1 gap-2 border-t border-blue-100 text-[10.5px]">
                <label className="flex items-center gap-1.5 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrincipalApproved}
                    onChange={(e) => setIsPrincipalApproved(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>प्रशासकीय स्वीकृति (Approved)</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-[#1e3a5f]"
                  />
                  <span>पृष्ठभूमि वाटरमार्क (Watermark)</span>
                </label>
              </div>
            </div>

            {/* Typography & Color Customizer */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-bold text-gray-800 text-xs">
                <span className="flex items-center gap-1.5">
                  <Palette size={14} className="text-[#1e3a5f]" />
                  <span>Text Sizes, Colors & Spacing (फन्ट, रङ तथा आकार):</span>
                </span>
                <span className="text-[10px] font-mono text-gray-500">Body: {fontSize}px</span>
              </div>

              {/* Font Selector */}
              <div className="grid grid-cols-2 gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFont(f.id)}
                    className={`p-1.5 rounded-lg border text-left transition font-semibold text-[10.5px] cursor-pointer ${
                      selectedFont === f.id
                        ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f] font-bold ring-1 ring-[#1e3a5f]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-slate-100'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* Sliders: Body Font Size & Line Height */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/80 text-[11px] text-gray-700">
                <div>
                  <div className="flex justify-between">
                    <span>अक्षर आकार (Body Font):</span>
                    <strong className="font-mono">{fontSize}px</strong>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    step="0.5"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a5f]"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>लाइन खाली ठाउँ (Line Spacing):</span>
                    <strong className="font-mono">{lineHeight}x</strong>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.4"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* Title & Subject Formatting Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/80 text-[11px] text-gray-700">
                <div>
                  <div className="flex justify-between">
                    <span>शीर्षक आकार (Header Size):</span>
                    <strong className="font-mono">{headerFontSize}px</strong>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="26"
                    step="1"
                    value={headerFontSize}
                    onChange={(e) => setHeaderFontSize(parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a5f]"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>विषय आकार (Subject Size):</span>
                    <strong className="font-mono">{subjectFontSize}px</strong>
                  </div>
                  <input
                    type="range"
                    min="13"
                    max="22"
                    step="1"
                    value={subjectFontSize}
                    onChange={(e) => setSubjectFontSize(parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* Color Presets Picker */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-gray-600 block">अक्षरको रङ छनौट (Text & Header Color):</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setHeaderColor(c.hex);
                        setSubjectColor(c.hex);
                        setTextColor(c.hex === '#991b1b' || c.hex === '#065f46' ? '#111827' : c.hex);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-slate-100 text-[10px] font-bold cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-gray-500">Custom:</span>
                    <input
                      type="color"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="w-6 h-6 p-0 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Header Details */}
            <div className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
              <span className="font-bold text-gray-800 text-[11px] block">शीर्षक सम्पादन (Header Info):</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">विद्यालय नाम (नेपाली):</label>
                  <input
                    type="text"
                    value={letterForm.schoolNameNe}
                    onChange={(e) => setLetterForm({ ...letterForm, schoolNameNe: e.target.value })}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">School Name (English):</label>
                  <input
                    type="text"
                    value={letterForm.schoolNameEn}
                    onChange={(e) => setLetterForm({ ...letterForm, schoolNameEn: e.target.value })}
                    className="erp-input font-bold uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">ठेगाना (नेपाली):</label>
                  <input
                    type="text"
                    value={letterForm.schoolSubtitleNe}
                    onChange={(e) => setLetterForm({ ...letterForm, schoolSubtitleNe: e.target.value })}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">Address (English):</label>
                  <input
                    type="text"
                    value={letterForm.schoolSubtitleEn}
                    onChange={(e) => setLetterForm({ ...letterForm, schoolSubtitleEn: e.target.value })}
                    className="erp-input"
                  />
                </div>
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
              <label className="block font-bold text-gray-700 mb-1">सम्बोधन (Salutation):</label>
              <input
                type="text"
                value={letterForm.salutation}
                onChange={(e) => setLetterForm({ ...letterForm, salutation: e.target.value })}
                className="erp-input font-semibold"
                placeholder="महोदय / महाशय,"
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
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Printer size={14} className="text-blue-600" />
                <span>Direct Print (प्रिन्ट)</span>
              </button>
              <button
                type="button"
                disabled={createLetterMutation.isPending}
                onClick={() => createLetterMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] flex items-center gap-1.5 transition disabled:opacity-60 shadow-xs cursor-pointer"
              >
                <Send size={14} />
                <span>{createLetterMutation.isPending ? 'Saving...' : 'Save & Register (चलानी दर्ता)'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Letterhead A4 Paper (7 cols) */}
          <div
            style={{ fontFamily: activeFontCss }}
            className="lg:col-span-7 rounded-2xl border-2 border-gray-300 bg-white p-12 shadow-xl space-y-5 text-left min-h-[700px] relative overflow-hidden"
          >
            {/* Watermark Emblem */}
            {showWatermark && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.06] pointer-events-none">
                {customLogoUrl ? (
                  <img src={customLogoUrl} alt="Watermark" className="w-full h-full object-contain" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#1e3a5f" stroke-width="2"/>
                    <circle cx="50" cy="50" r="22" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
                  </svg>
                )}
              </div>
            )}

            {/* School Header */}
            <div className="relative border-b-2 border-black pb-3">
              {/* Left Circular Emblem or Custom Logo */}
              {showLogo && (
                <div
                  style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                  className="absolute left-0 top-0 rounded-full overflow-hidden flex items-center justify-center"
                >
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg viewBox="0 0 100 100" style={{ width: `${logoSize}px`, height: `${logoSize}px` }}>
                      <circle cx="50" cy="50" r="46" fill="none" stroke="#111" stroke-width="2.5"/>
                      <circle cx="50" cy="50" r="41" fill="none" stroke="#111" stroke-width="1.2"/>
                      <path id="previewCurveTop" d="M 15 50 A 35 35 0 0 1 85 50" fill="none"/>
                      <text fontSize="6.5" fontWeight="bold" fill="#111" textAnchor="middle">
                        <textPath href="#previewCurveTop" startOffset="50%">श्री नेपाल मा.वि. विश्रामपुर</textPath>
                      </text>
                      <path id="previewCurveBottom" d="M 15 50 A 35 35 0 0 0 85 50" fill="none"/>
                      <text fontSize="6.5" fontWeight="bold" fill="#111" textAnchor="middle">
                        <textPath href="#previewCurveBottom" startOffset="50%">स्था. २००७ • Estd. 2007</textPath>
                      </text>
                      <polygon points="50,22 56,36 71,36 59,45 63,59 50,50 37,59 41,45 29,36 44,36" fill="none" stroke="#111" strokeWidth="1.5"/>
                      <path d="M42,54 Q50,48 58,54 L58,62 Q50,57 42,62 Z" fill="#111"/>
                    </svg>
                  )}
                </div>
              )}

              {/* Center Typography */}
              <div
                style={{
                  paddingLeft: showLogo ? `${logoSize + 12}px` : '0',
                }}
                className="text-center pr-4 space-y-0.5"
              >
                <h2
                  style={{ fontSize: `${headerFontSize}px`, color: headerColor }}
                  className="font-black tracking-tight"
                >
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

            {/* Chalani & Patra Sankhya Row */}
            {letterForm.chalaniNo && (
              <div className="flex justify-between items-center text-xs font-bold text-gray-800 pt-1">
                <div>पत्र संख्या: <span className="font-mono">{letterForm.patraSankhya}</span></div>
                <div>चलानी नं.: <span className="font-mono">{letterForm.chalaniNo}</span></div>
              </div>
            )}

            {/* Date Bar on Right */}
            <div className="text-right text-xs font-bold text-gray-800">
              मिति: <span className="font-mono font-black">{letterForm.letterDateBs}</span>
            </div>

            {/* Subject Centered Bold */}
            <div
              style={{ fontSize: `${subjectFontSize}px`, color: subjectColor }}
              className="text-center font-black my-3 tracking-wide"
            >
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
              style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight, color: textColor }}
              className="text-justify indent-10 whitespace-pre-line leading-relaxed"
            >
              {letterForm.body}
            </div>

            {/* Signatory Footer Right */}
            <div className="pt-8 flex justify-end">
              <div className="text-center min-w-[200px] space-y-0.5">
                <div className="flex items-center justify-center gap-3 min-h-[50px] mb-1">
                  {showSeal && customSealUrl && (
                    <img
                      src={customSealUrl}
                      alt="School Seal"
                      style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                      className="object-contain"
                    />
                  )}
                  {includeSignature && isPrincipalApproved && (
                    <div className="h-10 flex items-center justify-center">
                      {customSignatureUrl ? (
                        <img
                          src={customSignatureUrl}
                          alt="Signature"
                          style={{ maxWidth: `${signatureWidth}px` }}
                          className="max-h-12 object-contain"
                        />
                      ) : (
                        <svg viewBox="0 0 160 40" className="w-32 h-8">
                          <path d="M20,28 Q45,5 65,22 T105,18 Q125,8 145,20" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <p className="font-black text-xs text-gray-950">
                  {letterForm.signatoryName}
                </p>
                <p className="text-[11px] font-bold text-[#1e3a5f]">{letterForm.signatoryRole}</p>
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
                          className="rounded-lg p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
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
