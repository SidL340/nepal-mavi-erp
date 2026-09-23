'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Award,
  Printer,
  Search,
  Plus,
  FileText,
  X,
  School,
  CheckCircle2,
  Sliders,
  Palette,
  Sparkles,
  QrCode,
  Save,
  RotateCcw,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'issue' | 'designer' | 'history'>('issue');
  const [certType, setCertType] = useState<'CHARACTER' | 'TRANSFER' | 'BONAFIDE' | 'APPRECIATION'>('CHARACTER');

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Form fields
  const [issuedDateBs, setIssuedDateBs] = useState(todayBS());
  const [characterGrade, setCharacterGrade] = useState('EXCELLENT (उत्कृष्ट)');
  const [reasonForLeave, setReasonForLeave] = useState('Guardian relocation / higher studies');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [appreciationFor, setAppreciationFor] = useState('Outstanding performance in Annual Sports & Academic Olympiad');
  const [conduct, setConduct] = useState('Good');
  const [issuedBy, setIssuedBy] = useState('Principal');
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<any>(null);

  // Template Designer State
  const [selectedTemplateType, setSelectedTemplateType] = useState<'CHARACTER' | 'TRANSFER' | 'BONAFIDE' | 'APPRECIATION'>('CHARACTER');
  const [templateForm, setTemplateForm] = useState({
    title: 'CHARACTER CERTIFICATE',
    titleNepali: 'चारित्रिक प्रमाणपत्र',
    bodyEn: `This is to certify that {{studentName}}, Son/Daughter of {{fatherName}} & {{motherName}}, resident of {{address}}, was a bonafide student of this institution. He/She was enrolled in Class {{class}} (Roll No: {{rollNo}}, Student ID: {{studentId}}) during the academic session {{academicYear}} BS. To the best of our knowledge and school records, his/her moral conduct, character, and academic attitude were {{character}}. He/She bears a good moral character. We wish him/her all success in future endeavors.`,
    bodyNe: `प्रमाणित गरिन्छ कि यस विद्यालयको शैक्षिक सत्र {{academicYear}} मा कक्षा {{class}} (रोल नं {{rollNo}}, विद्यार्थी संकेत नं {{studentId}}) मा अध्ययनरत श्री/सुश्री {{studentName}}, पिता {{fatherName}} तथा माता {{motherName}}, ठेगाना {{address}} ले यस विद्यालयमा अध्ययन गर्दा असल आचरण तथा {{character}} चरित्र प्रदर्शन गरेको व्यहोरा प्रमाणित गरिन्छ।`,
    borderStyle: 'double-navy',
  });

  // Fetch student search
  const { data: searchResults } = useQuery({
    queryKey: ['students-cert-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=6`);
      return res.data?.data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch certificate history
  const { data: certsData, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await api.get('/certificates');
      return res.data?.data || [];
    },
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const res = await api.get('/certificates/templates');
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

  // Load template into form on template selection change
  useEffect(() => {
    if (templatesData && templatesData.length > 0) {
      const t = templatesData.find((tpl: any) => tpl.type === selectedTemplateType);
      if (t) {
        setTemplateForm({
          title: t.title,
          titleNepali: t.titleNepali || '',
          bodyEn: t.bodyEn,
          bodyNe: t.bodyNe || '',
          borderStyle: t.borderStyle || 'double-navy',
        });
      }
    }
  }, [selectedTemplateType, templatesData]);

  // Issue Certificate Mutation
  const issueCertMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('Please search and select a student');
      const res = await api.post('/certificates/generate', {
        studentId: selectedStudent.id,
        type: certType,
        issuedDateBs,
        issuedBy,
        remarks:
          certType === 'CHARACTER'
            ? `Character: ${characterGrade}`
            : certType === 'TRANSFER'
            ? `Transferred to: ${destinationSchool || 'New Institution'}`
            : appreciationFor,
        data: {
          characterGrade,
          reasonForLeave,
          destinationSchool,
          appreciationFor,
          conduct,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.data?.type || certType} Certificate issued! Cert No: ${data.data?.certificateNo}`);
      setSelectedCertForPrint(data.data);
      setSelectedStudent(null);
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to issue certificate');
    },
  });

  // Save Template Mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/certificates/templates', {
        type: selectedTemplateType,
        ...templateForm,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate Template customized and saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save template');
    },
  });

  const insertPlaceholder = (tag: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      bodyEn: prev.bodyEn + ` {{${tag}}}`,
    }));
  };

  const getResolvedCertificateText = (templateText: string, student: any) => {
    if (!templateText) return '';
    const name = student?.fullName || '................................................';
    const father = student?.fatherName || '................................................';
    const mother = student?.motherName || '................................................';
    const address = student?.address || 'Bishrampur, Rautahat';
    const cls = student?.classEnrollment?.[0]?.class?.name || '10';
    const roll = student?.classEnrollment?.[0]?.rollNo || '1';
    const stId = student?.studentId || 'SNSS-001';
    const dob = student?.dateOfBirthBs || '2068-01-01';
    const yr = '2083';

    return templateText
      .replace(/{{studentName}}/g, name)
      .replace(/{{fatherName}}/g, father)
      .replace(/{{motherName}}/g, mother)
      .replace(/{{address}}/g, address)
      .replace(/{{class}}/g, cls)
      .replace(/{{rollNo}}/g, roll)
      .replace(/{{studentId}}/g, stId)
      .replace(/{{dobBs}}/g, dob)
      .replace(/{{academicYear}}/g, yr)
      .replace(/{{character}}/g, characterGrade)
      .replace(/{{schoolName}}/g, schoolData?.name || 'Shree Nepal Secondary School');
  };

  const triggerCertificatePrint = (certObj?: any) => {
    const c = certObj || selectedCertForPrint;
    if (!c) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const typeTitle =
      c.type === 'CHARACTER'
        ? 'CHARACTER CERTIFICATE'
        : c.type === 'TRANSFER'
        ? 'TRANSFER CERTIFICATE (T.C.)'
        : c.type === 'BONAFIDE'
        ? 'BONAFIDE STUDENT CERTIFICATE'
        : 'CERTIFICATE OF APPRECIATION';

    const certContent = c.contentHtml || c.remarks || '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${typeTitle} - ${c.student?.fullName || 'Student'}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: "Georgia", "Times New Roman", serif; margin: 0; padding: 0; background: #fff; color: #111; line-height: 1.8; }
            .cert-frame { border: 6px double #1e3a5f; padding: 30px; position: relative; min-height: 90vh; background: #fffdfa; }
            .cert-inner-frame { border: 1px dashed #d97706; padding: 25px; height: 100%; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
            .school-name { font-size: 24px; font-weight: 900; color: #1e3a5f; margin: 2px 0; text-transform: uppercase; }
            .sub-title { font-size: 13px; font-weight: bold; color: #4b5563; font-family: sans-serif; }
            .cert-badge { font-size: 16px; font-weight: 900; background: #fef3c7; color: #78350f; display: inline-block; padding: 5px 24px; border-radius: 6px; margin-top: 10px; border: 2px solid #fde68a; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif; }
            .meta-bar { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; margin-bottom: 24px; color: #374151; font-family: sans-serif; }
            .content-body { font-size: 15px; text-align: justify; margin: 30px 0 60px 0; line-height: 2.2; text-indent: 40px; }
            .footer-sig { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; font-weight: bold; font-family: sans-serif; }
            .sig-box { width: 170px; text-align: center; border-top: 1px solid #333; padding-top: 6px; }
            .qr-seal { display: flex; flex-direction: column; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="cert-frame">
            <div class="cert-inner-frame">
              <div class="header">
                <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
                <div class="sub-title">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
                <div style="font-size: 11px; color: #6b7280; font-family: sans-serif; margin-top: 2px;">
                  ESTD: 2025 BS • EMIS CODE: 320160002 • GOVERNMENT OF NEPAL
                </div>
                <div class="cert-badge">${typeTitle}</div>
              </div>

              <div class="meta-bar">
                <div>Certificate No: <strong>${c.certificateNo || 'SNSS-2083-001'}</strong></div>
                <div>Date of Issue: <strong>${c.issuedDateBs || todayBS()} BS</strong></div>
              </div>

              <div class="content-body">
                ${certContent || `This is to certify that <strong>${c.student?.fullName || 'Student'}</strong>, Son/Daughter of <strong>${c.student?.fatherName || '—'}</strong> & <strong>${c.student?.motherName || '—'}</strong>, resident of <strong>${c.student?.address || 'Bishrampur'}</strong>, was a bonafide student of this institution in Class <strong>${c.student?.classEnrollment?.[0]?.class?.name || '10'}</strong>. To the best of our knowledge, he/she bears an <strong>${characterGrade}</strong> moral character and conduct. We wish him/her every success in future academic endeavors.`}
              </div>

              <div class="footer-sig">
                <div class="sig-box">
                  <div>Class Teacher</div>
                  <div style="font-size: 9px; color: #6b7280; font-weight: normal;">कक्षा शिक्षक</div>
                </div>

                <div class="qr-seal">
                  <div style="border: 2px solid #1e3a5f; padding: 4px; border-radius: 6px; background: #fff; text-align: center;">
                    <div style="font-size: 9px; font-weight: 900; color: #1e3a5f;">VERIFIED RECORD</div>
                    <div style="font-size: 8px; font-family: monospace; color: #555;">${c.verificationCode || 'SNSS-VERIFIED'}</div>
                  </div>
                  <div style="font-size: 9px; font-weight: bold; margin-top: 4px; color: #1e3a5f;">School Official Seal</div>
                </div>

                <div class="sig-box">
                  <div>${c.issuedBy || 'Headmaster / Principal'}</div>
                  <div style="font-size: 9px; color: #6b7280; font-weight: normal;">प्रधानाध्यापक</div>
                </div>
              </div>
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

  const certificates = certsData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Award className="text-[#1e3a5f]" />
            <span>Certificates & Template Designer (प्रमाणपत्र व्यवस्थापन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            Character Certificate (CC), Transfer Certificate (TC), Bonafide तथा प्रशंसा पत्र निर्माण र अनुकूलन
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('issue')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'issue' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Award size={14} />
            <span>Issue Certificate (जारी)</span>
          </button>
          <button
            onClick={() => setActiveTab('designer')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'designer' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Palette size={14} />
            <span>Template Designer (ढाँचा सम्पादक)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span>Issued Log (अभिलेख)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: ISSUE CERTIFICATE ════════════════════ */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span>Issue Official School Certificate</span>
              </h2>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                {certType}
              </span>
            </div>

            {/* Certificate Type Selector */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Certificate Type (प्रमाणपत्रको प्रकार):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCertType('CHARACTER')}
                  className={`p-2 rounded-xl border text-center font-bold transition ${
                    certType === 'CHARACTER'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  Character (चारित्रिक)
                </button>
                <button
                  type="button"
                  onClick={() => setCertType('TRANSFER')}
                  className={`p-2 rounded-xl border text-center font-bold transition ${
                    certType === 'TRANSFER'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  Transfer (TC स्थानान्तरण)
                </button>
                <button
                  type="button"
                  onClick={() => setCertType('BONAFIDE')}
                  className={`p-2 rounded-xl border text-center font-bold transition ${
                    certType === 'BONAFIDE'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  Bonafide (विद्यार्थी प्रमाणित)
                </button>
                <button
                  type="button"
                  onClick={() => setCertType('APPRECIATION')}
                  className={`p-2 rounded-xl border text-center font-bold transition ${
                    certType === 'APPRECIATION'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  Appreciation (प्रशंसा पत्र)
                </button>
              </div>
            </div>

            {/* Student Search */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Search & Select Student *:</label>
              {selectedStudent ? (
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <div>
                    <p className="font-bold text-[#1e3a5f]">{selectedStudent.fullName}</p>
                    <p className="text-[10px] text-gray-600 font-mono">
                      ID: {selectedStudent.studentId} | Class: {selectedStudent.classEnrollment?.[0]?.class?.name || '—'}
                    </p>
                    <p className="text-[10px] text-gray-600">Father: {selectedStudent.fatherName || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type student name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="erp-input pl-9"
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg divide-y divide-gray-100">
                      {searchResults.map((st: any) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setSelectedStudent(st);
                            setSearchQuery('');
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-blue-50 transition"
                        >
                          <div>
                            <span className="font-bold text-gray-900">{st.fullName}</span>
                            <span className="ml-2 rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                              {st.classEnrollment?.[0]?.class?.name || '—'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-400">{st.studentId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Issue Date BS (जारी मिति):</label>
              <input
                type="text"
                value={issuedDateBs}
                onChange={(e) => setIssuedDateBs(e.target.value)}
                className="erp-input font-mono font-bold"
              />
            </div>

            {/* Dynamic Specific Fields */}
            {certType === 'CHARACTER' && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">Moral Character & Conduct (आचरण):</label>
                <select
                  value={characterGrade}
                  onChange={(e) => setCharacterGrade(e.target.value)}
                  className="erp-input font-semibold"
                >
                  <option value="EXCELLENT (उत्कृष्ट)">EXCELLENT (उत्कृष्ट)</option>
                  <option value="VERY GOOD (धेरै राम्रो)">VERY GOOD (धेरै राम्रो)</option>
                  <option value="GOOD (राम्रो)">GOOD (राम्रो)</option>
                  <option value="SATISFACTORY (सन्तोषजनक)">SATISFACTORY (सन्तोषजनक)</option>
                </select>
              </div>
            )}

            {certType === 'TRANSFER' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Destination School (जाने विद्यालय):</label>
                  <input
                    type="text"
                    placeholder="e.g. Higher Secondary School, Pokhara"
                    value={destinationSchool}
                    onChange={(e) => setDestinationSchool(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Reason for Leaving (छोड्नुको कारण):</label>
                  <input
                    type="text"
                    value={reasonForLeave}
                    onChange={(e) => setReasonForLeave(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>
            )}

            {certType === 'APPRECIATION' && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">Awarded / Appreciated For (कारण):</label>
                <textarea
                  rows={2}
                  value={appreciationFor}
                  onChange={(e) => setAppreciationFor(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 mb-1">Authorized Signatory (प्रमाणीकरणकर्ता):</label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="erp-input font-semibold"
              />
            </div>

            <button
              type="button"
              disabled={issueCertMutation.isPending || !selectedStudent}
              onClick={() => issueCertMutation.mutate()}
              className="w-full rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] py-3 text-xs font-bold text-white transition disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
            >
              {issueCertMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating Certificate...</span>
                </>
              ) : (
                <>
                  <Award size={16} />
                  <span>Issue & Generate Certificate (जारी गर्नुहोस्)</span>
                </>
              )}
            </button>
          </div>

          {/* Right Live Preview (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border-4 border-double border-[#1e3a5f] bg-[#fffdfa] p-8 shadow-xs text-center space-y-5 font-serif relative">
            <div className="border-b-2 border-[#1e3a5f] pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-14 w-14 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1">
                  {schoolData?.logoUrl ? (
                    <img src={schoolData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <img src="/school_logo.png" alt="Seal" className="h-full w-full object-contain" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1e3a5f] uppercase tracking-wider">
                    {schoolData?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                  </h3>
                  <p className="text-xs text-gray-600 font-nepali">
                    {schoolData?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-sans">
                    EMIS: {schoolData?.emisCode || '320160002'} • Estd: {schoolData?.estYear || '2025'} BS
                  </p>
                </div>
              </div>

              <div className="inline-block mt-1 bg-[#1e3a5f] text-white text-xs font-sans font-bold px-6 py-1 rounded-full uppercase tracking-widest shadow-2xs">
                {certType} CERTIFICATE
              </div>
            </div>

            <div className="flex justify-between font-sans text-xs text-gray-600">
              <span>Ref No: <b>PREVIEW-001</b></span>
              <span>Date: <b>{issuedDateBs} BS</b></span>
            </div>

            <div className="text-left text-sm leading-loose text-gray-800 space-y-4 py-4 text-justify indent-8">
              {certType === 'CHARACTER' && (
                <p>
                  This is to certify that Mr./Ms.{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.fullName || '................................................'}
                  </strong>
                  , son/daughter of Mr.{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.fatherName || '................................................'}
                  </strong>
                  , was a bonafide student of this school in Class{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.classEnrollment?.[0]?.class?.name || '10'}
                  </strong>
                  . According to the school records, his/her date of birth is{' '}
                  <strong className="font-mono text-gray-900 border-b border-gray-400 px-2">
                    {selectedStudent?.dateOfBirthBs || '....................'}
                  </strong>{' '}
                  (BS). To the best of our knowledge, he/she bears an{' '}
                  <strong className="text-[#1e3a5f] uppercase underline">{characterGrade}</strong> moral character and
                  conduct. We wish him/her every success in all future endeavors.
                </p>
              )}

              {certType === 'TRANSFER' && (
                <p>
                  This is to certify that Mr./Ms.{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.fullName || '................................................'}
                  </strong>
                  , student ID{' '}
                  <strong className="font-mono text-gray-900 border-b border-gray-400 px-2">
                    {selectedStudent?.studentId || '....................'}
                  </strong>
                  , has been granted permission to transfer from this institution to{' '}
                  <strong className="text-[#1e3a5f]">{destinationSchool || 'New Institution'}</strong>. All school dues
                  have been cleared. Reason for leaving: <strong>{reasonForLeave}</strong>.
                </p>
              )}

              {certType === 'BONAFIDE' && (
                <p>
                  This is to certify that Mr./Ms.{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.fullName || '................................................'}
                  </strong>
                  , student ID{' '}
                  <strong className="font-mono text-gray-900 border-b border-gray-400 px-2">
                    {selectedStudent?.studentId || '....................'}
                  </strong>
                  , is a bonafide and regular student of Class{' '}
                  <strong className="text-[#1e3a5f]">
                    {selectedStudent?.classEnrollment?.[0]?.class?.name || '10'}
                  </strong>{' '}
                  in this school for the current academic session.
                </p>
              )}

              {certType === 'APPRECIATION' && (
                <p>
                  In recognition of exemplary commitment and distinguished performance, this Certificate of
                  Appreciation is proudly presented to{' '}
                  <strong className="text-gray-900 border-b border-gray-400 px-2 font-sans font-bold">
                    {selectedStudent?.fullName || '................................................'}
                  </strong>{' '}
                  for <strong>{appreciationFor}</strong>.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 pt-8 text-xs items-end font-sans">
              <div className="text-left">
                <span className="border-t border-gray-700 pt-1 font-bold">Class Teacher</span>
                <p className="text-[10px] text-gray-500">कक्षा शिक्षक</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#1e3a5f] flex flex-col items-center justify-center p-1 bg-white shadow-2xs">
                  <span className="text-[7px] font-black uppercase text-[#1e3a5f]">OFFICIAL SEAL</span>
                  <span className="text-[6px] text-gray-500">नेपाल मा.वि.</span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold mt-1">School Seal (छाप)</span>
              </div>

              <div className="text-right">
                <span className="border-t border-gray-700 pt-1 font-bold">{issuedBy}</span>
                <p className="text-[10px] text-gray-500">Headmaster / Principal</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: TEMPLATE DESIGNER ════════════════════ */}
      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Palette size={16} className="text-indigo-600" />
                <span>Customize Certificate Template (प्रमाणपत्र ढाँचा सम्पादन)</span>
              </h2>
            </div>

            {/* Template Target */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Choose Template Type to Edit:</label>
              <select
                value={selectedTemplateType}
                onChange={(e: any) => setSelectedTemplateType(e.target.value)}
                className="erp-input font-bold"
              >
                <option value="CHARACTER">Character Certificate Template</option>
                <option value="TRANSFER">Transfer Certificate (TC) Template</option>
                <option value="BONAFIDE">Bonafide Student Certificate Template</option>
                <option value="APPRECIATION">Certificate of Appreciation Template</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (English):</label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title (नेपाली):</label>
                <input
                  type="text"
                  value={templateForm.titleNepali}
                  onChange={(e) => setTemplateForm({ ...templateForm, titleNepali: e.target.value })}
                  className="erp-input font-nepali"
                />
              </div>
            </div>

            {/* Placeholder Chip Helpers */}
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Click to Insert Dynamic Placeholders (ट्याग थप्नुहोस्):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'studentName',
                  'fatherName',
                  'motherName',
                  'class',
                  'rollNo',
                  'studentId',
                  'dobBs',
                  'academicYear',
                  'character',
                  'address',
                  'schoolName',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertPlaceholder(tag)}
                    className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-[10px] font-mono font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition"
                  >
                    +{`{{${tag}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Body EN */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">English Certificate Body Paragraph:</label>
              <textarea
                rows={5}
                value={templateForm.bodyEn}
                onChange={(e) => setTemplateForm({ ...templateForm, bodyEn: e.target.value })}
                className="erp-input leading-relaxed font-mono text-[11px]"
              />
            </div>

            {/* Body NE */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">नेपाली व्यहोरा (Nepali Body Paragraph):</label>
              <textarea
                rows={4}
                value={templateForm.bodyNe}
                onChange={(e) => setTemplateForm({ ...templateForm, bodyNe: e.target.value })}
                className="erp-input leading-relaxed font-nepali text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={saveTemplateMutation.isPending}
                onClick={() => saveTemplateMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-60"
              >
                <Save size={14} />
                <span>{saveTemplateMutation.isPending ? 'Saving...' : 'Save Template (ढाँचा सेभ गर्नुहोस्)'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Render (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border-4 border-double border-[#1e3a5f] bg-[#fffdfa] p-8 shadow-xs text-center space-y-4 font-serif">
            <div className="border-b border-gray-300 pb-3">
              <h3 className="text-lg font-bold text-[#1e3a5f]">{templateForm.title}</h3>
              <p className="text-xs text-gray-500 font-nepali">{templateForm.titleNepali}</p>
            </div>

            <div className="text-left text-xs leading-loose text-gray-800 space-y-3 py-2 text-justify">
              <p className="border-l-2 border-amber-400 pl-3 italic bg-amber-50/50 p-2 rounded">
                {getResolvedCertificateText(templateForm.bodyEn, null)}
              </p>
              {templateForm.bodyNe && (
                <p className="border-l-2 border-blue-400 pl-3 font-nepali bg-blue-50/50 p-2 rounded">
                  {getResolvedCertificateText(templateForm.bodyNe, null)}
                </p>
              )}
            </div>

            <div className="flex justify-between pt-6 text-[10px] text-gray-500 font-sans border-t border-gray-200">
              <span>Dynamic placeholders auto-bind student records</span>
              <span>A4 Landscape Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 3: ISSUED CERTIFICATE ARCHIVE ════════════════════ */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
              Issued Certificates Registry (जारी गरिएका प्रमाणपत्र अभिलेख)
            </h2>
            <span className="text-xs text-gray-500">Total Issued: <strong>{certificates.length}</strong></span>
          </div>

          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Certificate No</th>
                <th className="p-3.5 font-bold uppercase">Type</th>
                <th className="p-3.5 font-bold uppercase">Student Name</th>
                <th className="p-3.5 font-bold uppercase">Issue Date (BS)</th>
                <th className="p-3.5 font-bold uppercase">Verification Code</th>
                <th className="p-3.5 font-bold uppercase text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Loading certificate records...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No certificates issued yet.
                  </td>
                </tr>
              ) : (
                certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{cert.certificateNo}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {cert.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-gray-900">{cert.student?.fullName}</td>
                    <td className="p-3.5 font-mono text-gray-600">{cert.issuedDateBs}</td>
                    <td className="p-3.5 font-mono text-[11px] text-gray-500">{cert.verificationCode || '—'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => triggerCertificatePrint(cert)}
                        className="rounded-lg p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition"
                        title="Print Certificate"
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
      )}

      {/* Print Modal */}
      {selectedCertForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Official Certificate Ready</span>
              <button onClick={() => setSelectedCertForPrint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 border-2 border-dashed border-[#1e3a5f] rounded-xl bg-amber-50/20 text-center space-y-3 font-serif">
              <h3 className="text-base font-bold text-[#1e3a5f]">{selectedCertForPrint.type} CERTIFICATE</h3>
              <p className="text-xs font-mono text-gray-600">Cert No: <b>{selectedCertForPrint.certificateNo}</b></p>
              <p className="text-sm font-bold text-gray-900">{selectedCertForPrint.student?.fullName}</p>
              <p className="text-xs text-gray-500 font-sans">Verification Code: {selectedCertForPrint.verificationCode}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCertForPrint(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => triggerCertificatePrint(selectedCertForPrint)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Certificate (प्रिन्ट गर्नुहोस्)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
