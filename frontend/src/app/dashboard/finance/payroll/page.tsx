'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
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

  // Fetch Teachers
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // Fetch Salary Scales
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/list');
      return res.data?.data || [];
    },
  });

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Fetch Payroll History
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data || [];
    },
  });

  // ─── LIVE NEPAL GOVERNMENT PAYROLL ENGINE ─────────────────────────────────
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

  // Auto-detect teacher scale on teacher change
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

  // Handle Scale select
  const handleScaleSelect = (scaleId: string) => {
    const scale = scalesData?.find((s: any) => s.id.toString() === scaleId);
    if (scale) {
      setTaha(scale.taha);
      setShreni(scale.shreni || '');
      setMoolTalab(scale.moolTalab);
      setGradeAmount(scale.gradeAmount);
    }
  };

  // Create Payroll Mutation
  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherId) throw new Error('Please select a teacher');
      const res = await api.post('/payroll', {
        teacherId: parseInt(selectedTeacherId),
        academicYearId: activeYear?.id || 1,
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
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Teacher Payroll generated & saved successfully!');
      setIsModalOpen(false);
      setSelectedSlip(data.data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to generate payroll');
    },
  });

  const payrolls = payrollsData || [];

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
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Generate Teacher Payroll (तलब तयार गर्नुहोस्)</span>
        </button>
      </div>

      {/* Payroll Records Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
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
                <th className="px-4 py-3.5 font-bold uppercase text-center">Slip</th>
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
                    <td className="px-4 py-3.5 font-bold text-gray-900">{p.teacher?.fullName}</td>
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
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedSlip(p)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                        title="View & Print Pay Slip"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── PAYROLL CREATION & LIVE CALCULATION MODAL ───────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f]">Teacher Payroll Calculator (नेपाल सरकार तलब फारम)</h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  ग्रेड रकम = ग्रेड संख्या × ग्रेड दर | खुद रकम = त्रैमासिक तलब - कट्टी - १% कर
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left 7 Cols: Inputs */}
              <div className="lg:col-span-7 space-y-4">
                {/* Teacher Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Select Teacher (शिक्षक) *:</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className="erp-input font-bold"
                    >
                      <option value="">Choose Teacher</option>
                      {teachersData?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} — {t.taha || (t.type === 'RASTRIYA' ? 'स्थाई' : 'निजी')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी स्केल) *:</label>
                    <select
                      value={scalesData?.find((s: any) => s.taha === taha)?.id || ''}
                      onChange={(e) => handleScaleSelect(e.target.value)}
                      className="erp-input font-bold text-[#1e3a5f]"
                    >
                      <option value="">Select Taha / Sreni</option>
                      {scalesData?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()} | ग्रेड: रू {s.gradeAmount})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Month From (महिना देखि):</label>
                    <input
                      type="text"
                      value={monthFrom}
                      onChange={(e) => setMonthFrom(e.target.value)}
                      placeholder="2081-04"
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Month To (महिना सम्म):</label>
                    <input
                      type="text"
                      value={monthTo}
                      onChange={(e) => setMonthTo(e.target.value)}
                      placeholder="2081-06"
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Basic Salary & Grades */}
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-3">
                  <span className="font-bold text-[#1e3a5f] block">१. मूल तलब र ग्रेड रकम</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">मूल तलब (Basic):</label>
                      <input
                        type="number"
                        value={moolTalab}
                        onChange={(e) => setMoolTalab(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">ग्रेड संख्या:</label>
                      <input
                        type="number"
                        value={gradeNo}
                        onChange={(e) => setGradeNo(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">प्रति ग्रेड दर:</label>
                      <input
                        type="number"
                        value={gradeAmount}
                        onChange={(e) => setGradeAmount(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Allowances (भत्ता) */}
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                  <span className="font-bold text-[#1e3a5f] block">२. भत्ता शीर्षकहरू (Allowances)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">महङ्गी भत्ता:</label>
                      <input
                        type="number"
                        value={mahangiGhata}
                        onChange={(e) => setMahangiGhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">प्र.अ. भत्ता:</label>
                      <input
                        type="number"
                        value={praABhata}
                        onChange={(e) => setPraABhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">सहायक प्र.अ. भत्ता:</label>
                      <input
                        type="number"
                        value={sahayakPraABhata}
                        onChange={(e) => setSahayakPraABhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">प्रा.वि. इन्चार्ज:</label>
                      <input
                        type="number"
                        value={prabiInchargeBhata}
                        onChange={(e) => setPrabiInchargeBhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">मा.वि. इन्चार्ज:</label>
                      <input
                        type="number"
                        value={mabiInchargeBhata}
                        onChange={(e) => setMabiInchargeBhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">अन्य भत्ता:</label>
                      <input
                        type="number"
                        value={otherBhata}
                        onChange={(e) => setOtherBhata(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions (कट्टी) */}
                <div className="rounded-xl bg-rose-50/40 p-3 border border-rose-100 space-y-2">
                  <span className="font-bold text-rose-800 block">३. कट्टी रकम (Deductions)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">कोष सापटी कट्टी:</label>
                      <input
                        type="number"
                        value={karmachariKoshSapati}
                        onChange={(e) => setKarmachariKoshSapati(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">बीमा कट्टी:</label>
                      <input
                        type="number"
                        value={bimaKati}
                        onChange={(e) => setBimaKati(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-0.5">पेश्की कट्टी:</label>
                      <input
                        type="number"
                        value={peshkiKati}
                        onChange={(e) => setPeshkiKati(Number(e.target.value))}
                        className="erp-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Festival and Remarks */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                    <input
                      type="checkbox"
                      checked={includeChaadparba}
                      onChange={(e) => setIncludeChaadparba(e.target.checked)}
                      className="rounded text-[#1e3a5f]"
                    />
                    <span>चाडपर्व खर्च समावेश गर्ने (= १ महिना ग्रेड सहित तलब)</span>
                  </label>
                </div>
              </div>

              {/* Right 5 Cols: Live Summary Output */}
              <div className="lg:col-span-5 rounded-2xl bg-slate-900 text-white p-5 space-y-3 font-mono shadow-inner">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block border-b border-slate-700 pb-2">
                  LIVE CALCULATION SHEET (निकासा विवरण)
                </span>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>मूल तलब (Basic):</span>
                    <span>रू {moolTalab.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ग्रेड रकम ({gradeNo} × {gradeAmount}):</span>
                    <span>+ रू {gradeRakam.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-300 border-t border-slate-700 pt-1">
                    <span>ग्रेड सहित तलब:</span>
                    <span>रू {gradeSahitTalab.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>जम्मा मासिक भत्ता:</span>
                    <span>+ रू {jammaBhata.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between font-bold text-white border-t border-slate-700 pt-1">
                    <span>जम्मा मासिक (तलब+भत्ता):</span>
                    <span>रू {jammaTalabBhata.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between font-extrabold text-blue-300 bg-slate-800 p-1.5 rounded">
                    <span>त्रैमासिक तलब (३ महिना):</span>
                    <span>रू {traimasikTalan.toLocaleString()}</span>
                  </div>

                  {/* Deductions breakdown */}
                  <div className="border-t border-slate-700 pt-2 space-y-1 text-[11px] text-rose-300">
                    <div className="flex justify-between">
                      <span>कर्मचारी संचय कोष (१०%):</span>
                      <span>- रू {karmachari10Pct.toLocaleString()}</span>
                    </div>
                    {karmachariKoshSapati > 0 && (
                      <div className="flex justify-between">
                        <span>कोष सापटी कट्टी:</span>
                        <span>- रू {karmachariKoshSapati.toLocaleString()}</span>
                      </div>
                    )}
                    {bimaKati > 0 && (
                      <div className="flex justify-between">
                        <span>बीमा कट्टी:</span>
                        <span>- रू {bimaKati.toLocaleString()}</span>
                      </div>
                    )}
                    {peshkiKati > 0 && (
                      <div className="flex justify-between">
                        <span>पेश्की कट्टी:</span>
                        <span>- रू {peshkiKati.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-rose-400">
                      <span>जम्मा कट्टी:</span>
                      <span>- रू {jammaKati.toLocaleString()}</span>
                    </div>
                  </div>

                  {includeChaadparba && (
                    <div className="flex justify-between font-bold text-amber-300">
                      <span>चाडपर्व खर्च:</span>
                      <span>+ रू {chaadparbaKharcha.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1">
                    <span>कुल रकम (कर अघि):</span>
                    <span>रू {kulRakam.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-rose-400">
                    <span>सामाजिक सुरक्षा कर (१%):</span>
                    <span>- रू {samajikSurakshaKar1Pct.toLocaleString()}</span>
                  </div>

                  {/* Grand Net Total */}
                  <div className="mt-3 rounded-xl bg-emerald-950 border border-emerald-500/30 p-3 text-emerald-300">
                    <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-400">
                      KHUD PAAUNU PARNE (खुद पाउने रकम)
                    </span>
                    <p className="text-xl font-extrabold text-white mt-1">
                      रू {khudPaaunuParne.toLocaleString()}
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-500 pt-1">
                    * Employer SSK २०% = रू {ssk20Pct.toLocaleString()} (थप कोष)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => createPayrollMutation.mutate()}
                  disabled={createPayrollMutation.isPending || !selectedTeacherId}
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-3 text-xs font-bold text-[#1e3a5f] font-sans transition disabled:opacity-60 shadow-md"
                >
                  {createPayrollMutation.isPending ? 'Saving...' : 'Save & Issue Payroll Slip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE PAYROLL SLIP MODAL ────────────────────────────────────── */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between no-print border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Teacher Pay Slip (तलब भर्पाइ)</span>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Slip Paper */}
            <div className="p-6 border border-gray-300 rounded-xl space-y-4 text-xs font-serif bg-white">
              <div className="text-center border-b border-gray-300 pb-3">
                <h3 className="text-base font-extrabold text-gray-900 uppercase">NEPAL MODEL SECONDARY SCHOOL</h3>
                <p className="text-xs text-gray-600 font-nepali">नेपाल आदर्श माध्यमिक विद्यालय, काठमाडौँ</p>
                <div className="inline-block mt-2 bg-[#1e3a5f] text-white text-[11px] font-sans font-bold px-3 py-0.5 rounded">
                  शिक्षक तलब तथा भत्ता निकासा विवरण (PAY SLIP)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Teacher: <b>{selectedSlip.teacher?.fullName}</b></p>
                <p>Period: <b>{selectedSlip.monthFrom} देखि {selectedSlip.monthTo} सम्म</b></p>
                <p>Taha / Shreni: <b>{selectedSlip.taha}</b></p>
                <p>Type: <b>{selectedSlip.teacher?.type === 'RASTRIYA' ? 'स्थाई (Government)' : 'निजी स्रोत'}</b></p>
              </div>

              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>शीर्षक</th>
                    <th>विवरण</th>
                    <th style={{ textAlign: 'right' }}>रकम (रू)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>मूल तलब + ग्रेड</td>
                    <td>रू {selectedSlip.moolTalab} + ({selectedSlip.gradeNo} × {selectedSlip.gradeAmount})</td>
                    <td style={{ textAlign: 'right' }}>{selectedSlip.gradeSahitTalab?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>जम्मा भत्ता</td>
                    <td>महङ्गी, प्र.अ. तथा अन्य भत्ता</td>
                    <td style={{ textAlign: 'right' }}>{selectedSlip.jammaBhata?.toLocaleString()}</td>
                  </tr>
                  <tr className="total-row">
                    <td>त्रैमासिक तलब (३ महिना)</td>
                    <td>मासिक जम्मा × ३</td>
                    <td style={{ textAlign: 'right' }}>{selectedSlip.traimasikTalan?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>कर्मचारी संचय कोष (१०%)</td>
                    <td>कर्मचारी कट्टी</td>
                    <td style={{ textAlign: 'right', color: 'red' }}>- {selectedSlip.karmachari10Pct?.toLocaleString()}</td>
                  </tr>
                  {selectedSlip.bimaKati > 0 && (
                    <tr>
                      <td>बीमा कट्टी</td>
                      <td>बीमा प्रिमियम</td>
                      <td style={{ textAlign: 'right', color: 'red' }}>- {selectedSlip.bimaKati?.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td>सामाजिक सुरक्षा कर (१%)</td>
                    <td>नेपाल सरकार कर</td>
                    <td style={{ textAlign: 'right', color: 'red' }}>- {selectedSlip.samajikSurakshaKar1Pct?.toLocaleString()}</td>
                  </tr>
                  <tr className="total-row" style={{ fontSize: '13px', background: '#e6f4ea' }}>
                    <td><b>खुद भुक्तानी पाउने रकम</b></td>
                    <td><b>KHUD PAAUNU PARNE</b></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0d652d' }}>
                      रू {selectedSlip.khudPaaunuParne?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 pt-8 text-center text-[11px] text-gray-700">
                <div>
                  <div className="border-t border-gray-400 mx-4 pt-1">तयार गर्ने (Accountant)</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 mx-4 pt-1">पाउने शिक्षक (Teacher)</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 mx-4 pt-1">प्रधानाध्यापक (Principal)</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Slip (प्रिन्ट)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
