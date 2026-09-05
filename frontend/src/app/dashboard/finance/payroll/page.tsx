'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, resolveFinancialYear, getFiscalYearFromBS } from '@/lib/nepali-date';
import {
  Wallet,
  Plus,
  Printer,
  X,
  FileText,
  Calculator,
  CheckCircle2,
  Calendar,
  Building,
  Edit2,
  Trash2,
  UserCheck,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [monthFrom, setMonthFrom] = useState('2081-04');
  const [monthTo, setMonthTo] = useState('2081-06');
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  // Live calculation form state
  const [taha, setTaha] = useState('रा.प. द्वितीय श्रेणी');
  const [shreni, setShreni] = useState('द्वितीय');
  const [moolTalab, setMoolTalab] = useState<number>(38000);
  const [gradeNo, setGradeNo] = useState<number>(4);
  const [gradeAmount, setGradeAmount] = useState<number>(950);

  // Allowances
  const [mahangiGhata, setMahangiGhata] = useState<number>(2000);
  const [praABhata, setPraABhata] = useState<number>(0);
  const [sahayakPraABhata, setSahayakPraABhata] = useState<number>(0);
  const [prabiInchargeBhata, setPrabiInchargeBhata] = useState<number>(0);
  const [mabiInchargeBhata, setMabiInchargeBhata] = useState<number>(0);
  const [otherBhata, setOtherBhata] = useState<number>(0);

  // Deductions
  const [karmachariKoshSapati, setKarmachariKoshSapati] = useState<number>(0);
  const [bimaKati, setBimaKati] = useState<number>(400);
  const [peshkiKati, setPeshkiKati] = useState<number>(0);

  // Special additions
  const [includeChaadparba, setIncludeChaadparba] = useState<boolean>(false);
  const [peshki, setPeshki] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

  // Fetch Teachers (Directly synced with Teacher Module)
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // Fetch Salary Scales
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales-list'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/list');
      return res.data?.data || [];
    },
  });

  // Fetch Active Academic Year
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Fetch Financial Years (आर्थिक वर्षहरू)
  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });
  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];

  // Fetch Payroll History
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data || [];
    },
  });

  const activeYear = schoolProfile?.academicYears?.find((y: any) => y.isActive);
  const autoResolvedFY = resolveFinancialYear(monthFrom.length === 7 ? `${monthFrom}-01` : monthFrom, financialYearsData || []);

  // ── LIVE FORM FORMULA CALCULATIONS ──────────────────────────────────────
  const gradeRakam = gradeNo * gradeAmount;
  const gradeSahitTalab = moolTalab + gradeRakam;
  const karmachari10Pct = +(gradeSahitTalab * 0.10).toFixed(2);
  const ssk20Pct = +(gradeSahitTalab * 0.20).toFixed(2);

  const jammaBhata = +(
    mahangiGhata +
    praABhata +
    sahayakPraABhata +
    prabiInchargeBhata +
    mabiInchargeBhata +
    otherBhata
  ).toFixed(2);

  const jammaTalabBhata = +(gradeSahitTalab + jammaBhata).toFixed(2);
  const traimasikTalan = +(jammaTalabBhata * 3).toFixed(2); // 3 months salary

  const jammaKati = +(karmachari10Pct + karmachariKoshSapati + bimaKati + peshkiKati).toFixed(2);
  const bakiPaaunuParne = +(traimasikTalan - jammaKati).toFixed(2);

  const chaadparbaKharcha = includeChaadparba ? gradeSahitTalab : 0;
  const kulRakam = +(bakiPaaunuParne + chaadparbaKharcha + peshki).toFixed(2);

  const samajikSurakshaKar1Pct = +(kulRakam * 0.01).toFixed(2);
  const khudPaaunuParne = +(kulRakam - samajikSurakshaKar1Pct).toFixed(2);

  // Auto-detect teacher scale on teacher selection
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    if (!teacherId) return;
    const teacher = teachersData?.find((t: any) => t.id.toString() === teacherId);
    if (teacher?.taha) {
      setTaha(teacher.taha);
      const matchedScale = scalesData?.find((s: any) =>
        s.taha.toLowerCase().includes(teacher.taha.toLowerCase()) ||
        teacher.taha.toLowerCase().includes(s.taha.toLowerCase())
      );
      if (matchedScale) {
        setMoolTalab(matchedScale.moolTalab);
        setGradeAmount(matchedScale.gradeAmount);
        setShreni(matchedScale.shreni || '');
      }
    }
  };

  const handleScaleSelect = (scaleId: string) => {
    const scale = scalesData?.find((s: any) => s.id.toString() === scaleId);
    if (scale) {
      setTaha(scale.taha);
      setShreni(scale.shreni || '');
      setMoolTalab(scale.moolTalab);
      setGradeAmount(scale.gradeAmount);
    }
  };

  // Handle Quick Generate from Teacher Card
  const handleQuickGenerateForTeacher = (teacher: any) => {
    setEditingPayroll(null);
    setSelectedTeacherId(teacher.id.toString());
    if (teacher.taha) {
      setTaha(teacher.taha);
      const matchedScale = scalesData?.find((s: any) =>
        s.taha.toLowerCase().includes(teacher.taha.toLowerCase()) ||
        teacher.taha.toLowerCase().includes(s.taha.toLowerCase())
      );
      if (matchedScale) {
        setMoolTalab(matchedScale.moolTalab);
        setGradeAmount(matchedScale.gradeAmount);
        setShreni(matchedScale.shreni || '');
      }
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal & Populate State
  const handleOpenEditModal = (p: any) => {
    setEditingPayroll(p);
    setSelectedTeacherId(p.teacherId?.toString() || '');
    setMonthFrom(p.monthFrom || '2081-04');
    setMonthTo(p.monthTo || '2081-06');
    setTaha(p.taha || 'रा.प. द्वितीय श्रेणी');
    setShreni(p.shreni || 'द्वितीय');
    setMoolTalab(p.moolTalab || 0);
    setGradeNo(p.gradeNo || 0);
    setGradeAmount(p.gradeAmount || 0);
    setMahangiGhata(p.mahangiGhata || 0);
    setPraABhata(p.praABhata || 0);
    setSahayakPraABhata(p.sahayakPraABhata || 0);
    setPrabiInchargeBhata(p.prabiInchargeBhata || 0);
    setMabiInchargeBhata(p.mabiInchargeBhata || 0);
    setOtherBhata(p.otherBhata || 0);
    setKarmachariKoshSapati(p.karmachariKoshSapati || 0);
    setBimaKati(p.bimaKati || 0);
    setPeshkiKati(p.peshkiKati || 0);
    setIncludeChaadparba(Boolean(p.chaadparbaKharcha));
    setPeshki(p.peshki || 0);
    setRemarks(p.remarks || '');
    setIsModalOpen(true);
  };

  // Create Payroll Mutation
  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherId) throw new Error('Please select a teacher');
      const payload = {
        teacherId: parseInt(selectedTeacherId),
        academicYearId: activeYear?.id || 1,
        financialYearId: autoResolvedFY?.id || activeFinancialYear?.id,
        monthFrom,
        monthTo,
        taha,
        shreni,
        moolTalab,
        gradeNo,
        gradeAmount,
        mahangiGhata,
        praABhata,
        sahayakPraABhata,
        prabiInchargeBhata,
        mabiInchargeBhata,
        otherBhata,
        karmachariKoshSapati,
        bimaKati,
        peshkiKati,
        includeChaadparba,
        peshki,
        remarks,
      };
      if (editingPayroll) {
        const res = await api.put(`/payroll/${editingPayroll.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/payroll', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(editingPayroll ? 'Payroll record updated successfully!' : 'Teacher Payroll generated & saved successfully!');
      setIsModalOpen(false);
      setEditingPayroll(null);
      setSelectedSlip(data.data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to save payroll');
    },
  });

  // Delete Payroll Mutation (Proxy-Proof)
  const deletePayrollMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payroll record deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete payroll record.');
    },
  });

  const payrolls = payrollsData || [];

  // Filtered teachers list for quick selection
  const filteredTeachers = (teachersData || []).filter((t: any) =>
    t.fullName?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    t.panNo?.includes(teacherSearchTerm)
  );

  const triggerPayrollSlipPrint = () => {
    if (!selectedSlip) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const p = selectedSlip;
    const teacherName = p.teacher?.fullName || p.teacherName || '—';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${teacherName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 20px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 17px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 150px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${schoolProfile?.name || 'SHREE NEPAL SECONDARY SCHOOL'}</div>
              <div style="font-size: 10px; color: #64748b;">${schoolProfile?.address || 'Nepal'} | Teacher & Staff Official Pay Slip</div>
              <div class="badge">आर्थिक वर्ष: ${p.financialYear?.year || getFiscalYearFromBS(p.monthFrom || todayBS())} | PERIOD: ${p.monthFrom || ''} TO ${p.monthTo || ''}</div>
            </div>

            <div class="meta-grid">
              <div><strong>TEACHER NAME:</strong> ${teacherName}</div>
              <div><strong>TYPE / TAHA:</strong> ${p.taha || '—'}</div>
              <div><strong>PAN NO:</strong> ${p.teacher?.panNo || 'N/A'}</div>
              <div><strong>ACCOUNT NO:</strong> ${p.teacher?.bankAccountNo || 'Bank Deposit'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>EARNING HEADS (निकासा शिर्षक)</th>
                  <th style="text-align: right; width: 120px;">AMOUNT (रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Mool Talab / Basic Salary (मूल तलब)</td><td style="text-align: right; font-family: monospace;">${(p.moolTalab || 0).toLocaleString()}</td></tr>
                <tr><td>Grade Rakam (${p.gradeNo || 0} Grades) (ग्रेड रकम)</td><td style="text-align: right; font-family: monospace;">${(p.gradeRakam || 0).toLocaleString()}</td></tr>
                <tr style="background: #f1f5f9; font-weight: bold;"><td>Grade Sahit Salary (ग्रेड सहित तलब)</td><td style="text-align: right; font-family: monospace;">${(p.gradeSahitTalab || 0).toLocaleString()}</td></tr>
                <tr><td>Mahangi Bhata (महँगी भत्ता)</td><td style="text-align: right; font-family: monospace;">${(p.mahangiGhata || 0).toLocaleString()}</td></tr>
                <tr><td>Pra-A / Incharge Bhata (प्र.अ. / इन्चार्ज भत्ता)</td><td style="text-align: right; font-family: monospace;">${(p.praABhata || 0).toLocaleString()}</td></tr>
                <tr style="background: #f8fafc; font-weight: bold;"><td>Traimasik Total Gross Salary (त्रिमासिक जम्मा तलब भत्ता)</td><td style="text-align: right; font-family: monospace; font-size: 11px; color: #1e3a5f;">${(p.traimasikTalan || 0).toLocaleString()}</td></tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>DEDUCTION HEADS (कट्टी विवरण)</th>
                  <th style="text-align: right; width: 120px;">AMOUNT (रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Karmachari Sanchaya Kosh 10% (कर्मचारी सञ्चय कोष)</td><td style="text-align: right; font-family: monospace;">${(p.karmachari10Pct || 0).toLocaleString()}</td></tr>
                <tr><td>Kosh Sapati / Loan (कोष सापती कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.karmachariKoshSapati || 0).toLocaleString()}</td></tr>
                <tr><td>Bima Katti (बीमा कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.bimaKatti || 0).toLocaleString()}</td></tr>
                <tr><td>Social Security Tax 1% (सामाजिक सुरक्षा कर)</td><td style="text-align: right; font-family: monospace;">${(p.samajikSurakshaKar1Pct || 0).toLocaleString()}</td></tr>
                <tr style="background: #fff1f2; font-weight: bold; color: #9f1239;"><td>Total Deductions (जम्मा कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.jammaKati || 0).toLocaleString()}</td></tr>
              </tbody>
            </table>

            <div style="background: #ecfdf5; border: 1.5px solid #059669; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 10px; font-weight: bold; color: #065f46; text-transform: uppercase;">KHUD PAAUNU PARNE (खुद पाउने रकम NET PAYABLE):</span>
                <div style="font-size: 8.5px; color: #047857;">Directly Deposited to Bank Account</div>
              </div>
              <strong style="font-size: 20px; color: #047857; font-family: monospace; font-weight: 900;">रू ${(p.khudPaaunuParne || 0).toLocaleString()}</strong>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Employee Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
              <div class="sig-box">Headmaster / Stamp</div>
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Teacher & Staff Payroll (शिक्षक तलब तथा भत्ता निकासा)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकारको नियमानुसार: ग्रेड, भत्ता, संचय कोष (१०%), पेश्की कट्टी, १% सामाजिक सुरक्षा कर र खुद भुक्तानी
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPayroll(null);
            setSelectedTeacherId('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Generate Teacher Payroll (तलब तयार गर्नुहोस्)</span>
        </button>
      </div>

      {/* ── REGISTERED TEACHERS DIRECT QUICK SELECTION ────────────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50/70 to-indigo-50/50 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="text-blue-700" size={18} />
            <h2 className="text-sm font-bold text-[#1e3a5f]">
              Registered Teachers List (शिक्षक सूची) — Direct Payroll Generation
            </h2>
            <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-[10px] font-black">
              {teachersData?.length || 0} Teachers
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search teacher by name/PAN..."
              value={teacherSearchTerm}
              onChange={(e) => setTeacherSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {!teachersData || teachersData.length === 0 ? (
          <p className="text-xs text-gray-500 italic p-2">
            No active teachers registered yet. Add teachers in <strong className="text-blue-700">Teachers Page</strong> to manage payroll.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredTeachers.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs hover:border-blue-300 transition"
              >
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-bold text-gray-900 truncate">{t.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{t.taha || t.post || 'Teacher'}</p>
                </div>
                <button
                  onClick={() => handleQuickGenerateForTeacher(t)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-[10px] font-bold shrink-0 transition"
                >
                  <Plus size={11} />
                  <span>Payroll</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payroll Records Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1e3a5f]">Generated Payroll History (निकासा विवरण)</h2>
          <span className="text-xs font-semibold text-gray-500">{payrolls.length} Total Payroll Slips</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold uppercase">Teacher Name</th>
                <th className="px-4 py-3.5 font-bold uppercase">Type & Taha</th>
                <th className="px-4 py-3.5 font-bold uppercase">Period (महिना)</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Grade सहित तलब</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">त्रैमासिक निकासा</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">जम्मा कट्टी</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">खुद पाउने रकम</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading payroll history...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <Wallet size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold text-gray-600">No payroll records generated yet</p>
                  </td>
                </tr>
              ) : (
                payrolls.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-bold text-gray-900">{p.teacher?.fullName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {p.teacher?.type === 'RASTRIYA' ? 'स्थाई (Govt)' : 'निजी स्रोत'}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">{p.taha}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-600">{p.monthFrom} to {p.monthTo}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-gray-800">
                      रू {p.gradeSahitTalab?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-blue-800">
                      रू {p.traimasikTalan?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-rose-700">
                      - रू {p.jammaKati?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-700 text-sm">
                      रू {p.khudPaaunuParne?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSlip(p)}
                          className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[10px] font-extrabold shadow-2xs transition"
                          title="Print Pay Slip"
                        >
                          <Printer size={12} />
                          <span>Slip</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold shadow-2xs transition"
                          title="Edit Payroll Record"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete payroll record for "${p.teacher?.fullName || 'Teacher'}"?`)) {
                              deletePayrollMutation.mutate(p.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[10px] font-bold shadow-2xs transition"
                          title="Delete Payroll Record"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GENERATE / EDIT PAYROLL MODAL ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1e3a5f]">
                  {editingPayroll ? 'Edit Teacher Payroll Record (तलब संशोधन)' : 'Nepal Government Teacher Payroll Engine (नेपाल सरकार शिक्षक निकासा)'}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingPayroll ? `Editing record #${editingPayroll.id}` : 'Select registered teacher or scale to auto-compute salary & deductions'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form Input Columns */}
              <div className="md:col-span-2 space-y-4">
                {/* 1. Teacher & Scale Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Select Teacher (शिक्षक)</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white font-medium"
                    >
                      <option value="">-- Choose Registered Teacher --</option>
                      {teachersData?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.type === 'RASTRIYA' ? 'Govt' : 'Private'} - {t.taha || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Scale Preset (तह/श्रेणी)</label>
                    <select
                      onChange={(e) => handleScaleSelect(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white"
                    >
                      <option value="">-- Select Scale Preset --</option>
                      {scalesData?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.taha} ({s.shreni}) — Rs. {s.moolTalab}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Period & Scale Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Month From (BS)</label>
                    <input
                      type="text"
                      value={monthFrom}
                      onChange={(e) => setMonthFrom(e.target.value)}
                      placeholder="2081-04"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Month To (BS)</label>
                    <input
                      type="text"
                      value={monthTo}
                      onChange={(e) => setMonthTo(e.target.value)}
                      placeholder="2081-06"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mool Talab (मूल तलब)</label>
                    <input
                      type="number"
                      value={moolTalab}
                      onChange={(e) => setMoolTalab(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grade No & Amount</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="No"
                        value={gradeNo}
                        onChange={(e) => setGradeNo(Number(e.target.value))}
                        className="w-1/2 rounded-lg border border-gray-300 p-2 text-xs font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Amt"
                        value={gradeAmount}
                        onChange={(e) => setGradeAmount(Number(e.target.value))}
                        className="w-1/2 rounded-lg border border-gray-300 p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-2">
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                    Allowances & Perks (भत्ता तथा सुविधाहरू)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-600">Mahangi Bhata (महँगी)</label>
                      <input
                        type="number"
                        value={mahangiGhata}
                        onChange={(e) => setMahangiGhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Pra-A Bhata (प्र.अ.)</label>
                      <input
                        type="number"
                        value={praABhata}
                        onChange={(e) => setPraABhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Incharge Bhata</label>
                      <input
                        type="number"
                        value={prabiInchargeBhata}
                        onChange={(e) => setPrabiInchargeBhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-2">
                  <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wide">
                    Deductions (कट्टी विवरणहरू)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-600">Kosh Sapati (सापती)</label>
                      <input
                        type="number"
                        value={karmachariKoshSapati}
                        onChange={(e) => setKarmachariKoshSapati(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Bima Katti (बीमा)</label>
                      <input
                        type="number"
                        value={bimaKati}
                        onChange={(e) => setBimaKati(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Peshki Katti (पेश्की)</label>
                      <input
                        type="number"
                        value={peshkiKati}
                        onChange={(e) => setPeshkiKati(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional voucher remarks..."
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="bg-[#1e3a5f] text-white p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 border-b border-blue-800 pb-2 mb-3">
                    <Calculator size={16} className="text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Live Payroll Computation
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-blue-900/60 pb-1">
                      <span className="text-gray-300">Basic + Grade ({gradeNo} Grades):</span>
                      <span className="font-mono font-bold">Rs. {gradeSahitTalab.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1">
                      <span className="text-gray-300">10% SSK (सञ्चय कोष):</span>
                      <span className="font-mono font-semibold text-rose-300">- Rs. {karmachari10Pct.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1">
                      <span className="text-gray-300">Total Allowances (भत्ता):</span>
                      <span className="font-mono font-semibold text-emerald-300">+ Rs. {jammaBhata.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 pt-1 font-bold text-amber-300">
                      <span>3-Month Gross (त्रिमासिक):</span>
                      <span className="font-mono">Rs. {traimasikTalan.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 text-rose-300">
                      <span>Total Deductions (कट्टी):</span>
                      <span className="font-mono">- Rs. {jammaKati.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 text-gray-300">
                      <span>1% Social Security Tax:</span>
                      <span className="font-mono">- Rs. {samajikSurakshaKar1Pct.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950/80 border border-emerald-500/40 p-3.5 rounded-xl">
                  <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                    NET PAYABLE TO TEACHER (खुद पाउने रकम):
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    Rs. {khudPaaunuParne.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => createPayrollMutation.mutate()}
                  disabled={createPayrollMutation.isPending}
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-extrabold shadow-lg transition"
                >
                  {createPayrollMutation.isPending
                    ? 'Saving Payroll...'
                    : editingPayroll
                    ? 'Update Payroll Record (निकासा अपडेट)'
                    : 'Save & Issue Payroll (निकासा सेभ गर्नुहोस्)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT PAY SLIP MODAL ────────────────────────────────────────────── */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">Pay Slip Options</h3>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-emerald-900">
                Payroll Slip Ready for {selectedSlip.teacher?.fullName || 'Teacher'}
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-mono">
                Net Pay: Rs. {(selectedSlip.khudPaaunuParne || 0).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600"
              >
                Close
              </button>
              <button
                onClick={triggerPayrollSlipPrint}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e3a5f] text-white hover:bg-[#2a5280]"
              >
                Print Official Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
