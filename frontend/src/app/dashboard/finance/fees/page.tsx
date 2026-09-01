'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  X,
  CreditCard,
  User,
  CheckCircle2,
  School as SchoolIcon,
  Stamp,
  Check,
  DollarSign,
  QrCode,
  Landmark,
  Zap,
  FileText,
  Bell,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLedgerModal from '@/components/StudentLedgerModal';

function FeeCollectionContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlStudentId = searchParams.get('studentId');

  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFeeHead, setSelectedFeeHead] = useState('');
  const [amount, setAmount] = useState('');
  const [paidDateBs, setPaidDateBs] = useState(todayBS());
  const [paymentMedium, setPaymentMedium] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [collectedBy, setCollectedBy] = useState('School Accountant');
  const [remarks, setRemarks] = useState('');
  const [latestReceipt, setLatestReceipt] = useState<any>(null);

  // Inline Fee Head Modal State
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');
  const [newHeadAmount, setNewHeadAmount] = useState('');

  // Generate Monthly Fees Modal State
  const [isGenerateMonthlyModalOpen, setIsGenerateMonthlyModalOpen] = useState(false);
  const [genClassId, setGenClassId] = useState('ALL');
  const [genMonthBs, setGenMonthBs] = useState(todayBS().slice(0, 7));
  const [genFeeHeadId, setGenFeeHeadId] = useState('');
  const [genDueDateBs, setGenDueDateBs] = useState(`${todayBS().slice(0, 7)}-30`);
  const [genSendNotice, setGenSendNotice] = useState(true);

  // Student Ledger Modal State
  const [ledgerStudentId, setLedgerStudentId] = useState<number | null>(null);

  // Auto pre-select student if studentId URL query param is present
  const { data: urlStudent } = useQuery({
    queryKey: ['student-url-preselect', urlStudentId],
    queryFn: async () => {
      if (!urlStudentId) return null;
      const res = await api.get(`/students/${urlStudentId}`);
      return res.data?.data;
    },
    enabled: !!urlStudentId,
  });

  useEffect(() => {
    if (urlStudent && !selectedStudent) {
      setSelectedStudent(urlStudent);
    }
  }, [urlStudent]);

  // Fetch School Profile for Receipt Header & Seal
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Fee Heads
  const { data: feeHeadsData } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: async () => {
      const res = await api.get('/income/fee-heads');
      return res.data?.data || [];
    },
  });

  // Auto-set feeHeadId in monthly generator when feeHeads load
  useEffect(() => {
    if (feeHeadsData?.length > 0 && !genFeeHeadId) {
      const monthlyHead = feeHeadsData.find((h: any) => h.name.toLowerCase().includes('monthly') || h.name.includes('महिना'));
      setGenFeeHeadId((monthlyHead || feeHeadsData[0]).id.toString());
    }
  }, [feeHeadsData, genFeeHeadId]);

  // Search Students
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['students-search-fee', searchStudent],
    queryFn: async () => {
      if (!searchStudent || searchStudent.length < 2) return [];
      const res = await api.get(`/students?search=${searchStudent}&limit=10`);
      return res.data?.data || [];
    },
    enabled: searchStudent.length >= 2,
  });

  // Fetch Fee Collections History
  const { data: collectionsData } = useQuery({
    queryKey: ['fee-collections-list'],
    queryFn: async () => {
      const res = await api.get('/income/fee-collections?limit=25');
      return res.data;
    },
  });

  // Auto update amount when fee head selected
  const handleFeeHeadChange = (headId: string) => {
    setSelectedFeeHead(headId);
    const selected = feeHeadsData?.find((h: any) => h.id.toString() === headId);
    if (selected) {
      setAmount(selected.amount ? selected.amount.toString() : '');
    }
  };

  // Collect Fee Mutation
  const collectFeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/fee-collections', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Fee collected successfully!');
      setLatestReceipt(data.data);
      queryClient.invalidateQueries({ queryKey: ['fee-collections-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
      setAmount('');
      setRemarks('');
      setPaymentRef('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to collect fee.');
    },
  });

  // Inline Sirshak Creation Mutation
  const createSirshakMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/fee-heads', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('New Fee Head (शीर्षक) created!');
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
      queryClient.invalidateQueries({ queryKey: ['fee-heads-all'] });
      setIsAddHeadModalOpen(false);
      if (data?.data?.id) {
        setSelectedFeeHead(data.data.id.toString());
        setAmount(data.data.amount ? data.data.amount.toString() : '');
      }
      setNewHeadName('');
      setNewHeadNameNepali('');
      setNewHeadAmount('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create fee head.');
    },
  });

  // Generate Monthly Fees Mutation
  const generateMonthlyFeesMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/fee-dues/generate-monthly', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Monthly fee dues generated successfully!');
      setIsGenerateMonthlyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate monthly fees.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Please select a student first.');
    if (!selectedFeeHead) return toast.error('Please select a fee head.');
    if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount.');

    collectFeeMutation.mutate({
      studentId: selectedStudent.id,
      feeHeadId: parseInt(selectedFeeHead),
      amount: parseFloat(amount),
      paidDateBs,
      paymentMedium,
      paymentRef,
      collectedBy,
      remarks,
    });
  };

  const triggerFeeReceiptPrint = () => {
    if (!latestReceipt) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const r = latestReceipt;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${r.receiptNo || 'Receipt'}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 15px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 10px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 4px; uppercase; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 10px; font-weight: bold; color: #4b5563;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
              <div class="badge" style="margin-top: 4px;">OFFICIAL FEE RECEIPT (शुल्क रसिद)</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5px; margin-bottom: 8px;">
              <span>Receipt No: <strong>${r.receiptNo || 'REC-001'}</strong></span>
              <span>Date: <strong>${r.paidDateBs || todayBS()} BS</strong></span>
            </div>

            <div class="grid">
              <div>Student Name: <strong>${r.studentName || '—'}</strong></div>
              <div>Class & Roll: <strong>${r.className || '—'} (Roll #${r.rollNo || '—'})</strong></div>
              <div>EMIS ID: <strong>${r.studentId || '—'}</strong></div>
              <div>Fee Head: <strong>${r.feeHeadName || 'School Fee'}</strong></div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; color: #065f46;">TOTAL PAID AMOUNT (जम्मा भुक्तानी):</span>
              <strong style="font-size: 16px; color: #047857; font-family: monospace;">रू ${(r.amount || 0).toLocaleString()}</strong>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Depositor Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
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
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Fee Collection & Billed Dues (शुल्क सङ्कलन तथा बक्यौता)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            भर्ना शुल्क, मासिक शुल्क स्वतः सिर्जना, रसिद कटानी तथा विद्यार्थी व्यक्तिगत खाता
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGenerateMonthlyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-black shadow-2xs transition"
          >
            <Zap size={15} />
            <span>⚡ Generate Monthly Fees (मासिक शुल्क सिर्जना)</span>
          </button>

          {selectedStudent && (
            <button
              onClick={() => setLedgerStudentId(selectedStudent.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-2xs transition"
            >
              <FileText size={15} />
              <span>Student Account Statement (खाता हेर्नुहोस्)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Search & Pre-selected Student Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">
              1. Search Student (विद्यार्थी खोज्नुहोस्)
            </h2>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Student Name or EMIS ID..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="erp-input pl-9 text-xs"
              />
            </div>

            {/* Search Dropdown */}
            {searchStudent.length >= 2 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
                {isSearching ? (
                  <p className="p-3 text-xs text-gray-400">Searching students...</p>
                ) : searchResults?.length === 0 ? (
                  <p className="p-3 text-xs text-gray-400">No matching student found.</p>
                ) : (
                  searchResults?.map((st: any) => {
                    const clsName = st.classEnrollment?.[0]?.class?.name;
                    const secName = st.classEnrollment?.[0]?.class?.section;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchStudent('');
                        }}
                        className="p-2.5 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-gray-900 font-extrabold">{st.fullName}</strong>
                          <span className="inline-block rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-black font-nepali border border-purple-200">
                            {clsName ? `${clsName}${secName ? ` (${secName})` : ''}` : 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 font-bold">{st.studentId}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Student Details Card */}
            {selectedStudent ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-base shrink-0 uppercase">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1e3a5f]">{selectedStudent.fullName}</h3>
                      <p className="text-[11px] text-gray-600 font-mono">EMIS ID: {selectedStudent.studentId}</p>
                      <p className="text-[11px] text-gray-500 font-nepali">
                        {selectedStudent.classEnrollment?.[0]?.class?.name || 'Class N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-gray-400 hover:text-gray-600 rounded p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-600">Guardian Contact:</span>
                  <span className="font-mono text-gray-900">{selectedStudent.guardianContact || selectedStudent.phone || '—'}</span>
                </div>

                <button
                  onClick={() => setLedgerStudentId(selectedStudent.id)}
                  className="w-full text-center text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 py-1.5 rounded-lg transition"
                >
                  📄 View Full Student Ledger Statement (खाता विवरण)
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                <User size={24} className="mx-auto mb-1 text-gray-300" />
                <p>No student selected. Search above or click "Collect Fee" from Student List.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Collect Fee Form */}
        <div className="lg:col-span-7 space-y-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4"
          >
            <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">
              2. Collect Fee Details (शुल्क कटानी विवरण)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Select Fee Head (शीर्षक) *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddHeadModalOpen(true)}
                    className="text-[11px] font-extrabold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>+ Add New Sirshak</span>
                  </button>
                </div>

                <select
                  value={selectedFeeHead}
                  onChange={(e) => handleFeeHeadChange(e.target.value)}
                  className="erp-input text-xs font-bold"
                  required
                >
                  <option value="">-- Choose Fee Head --</option>
                  {feeHeadsData?.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.nameNepali ? `(${h.nameNepali})` : ''} {h.amount ? `— Rs. ${h.amount}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Amount (रकम रू) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="erp-input text-xs font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Date BS (मिति) *</label>
                <input
                  type="text"
                  required
                  value={paidDateBs}
                  onChange={(e) => setPaidDateBs(e.target.value)}
                  className="erp-input text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode (भुक्तानी माध्यम)</label>
                <select
                  value={paymentMedium}
                  onChange={(e) => setPaymentMedium(e.target.value)}
                  className="erp-input text-xs font-bold"
                >
                  <option value="CASH">CASH (नगद)</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER (बैंक जम्मा)</option>
                  <option value="QR_CODE">QR CODE / FONEPAY (स्क्यान/अनलाइन)</option>
                  <option value="CHEQUE">CHEQUE (चेक)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Ref / Trans ID</label>
                <input
                  type="text"
                  placeholder="Trans ID / Cheque No / Voucher No"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="erp-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Collected By</label>
                <input
                  type="text"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  className="erp-input text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note</label>
              <textarea
                rows={2}
                placeholder="Optional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="erp-input text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={collectFeeMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Receipt size={16} />
                <span>{collectFeeMutation.isPending ? 'Processing...' : 'Collect Fee & Print Receipt (शुल्क भुक्तानी सेभ गर्नुहोस्)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Collections Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">
            Recent Fee Receipts (हालैका रसिदहरू)
          </h2>
          <span className="text-xs text-gray-500 font-mono">Total Receipts: {collectionsData?.total || 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date BS</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Fee Head</th>
                <th className="p-3 text-right">Amount (रू)</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!collectionsData?.data || collectionsData.data.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">No fee receipts found.</td></tr>
              ) : (
                collectionsData.data.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#1e3a5f]">{c.receiptNo}</td>
                    <td className="p-3 font-mono">{c.paidDateBs}</td>
                    <td className="p-3 font-bold text-gray-900">{c.student?.fullName || 'Student'}</td>
                    <td className="p-3 text-gray-700">{c.feeHead?.name || 'Fee'}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">Rs. {c.amount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[11px] uppercase">{c.paymentMedium || 'CASH'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setLatestReceipt(c)}
                        className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[11px] font-extrabold"
                      >
                        <Printer size={12} />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 1. INLINE SIRSHAK CREATION MODAL ─────────────────────────────── */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                Add New Fee Sirshak (नयाँ शुल्क शीर्षक थप्नुहोस्)
              </h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSirshakMutation.mutate({
                  name: newHeadName,
                  nameNepali: newHeadNameNepali,
                  amount: newHeadAmount ? parseFloat(newHeadAmount) : 0,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Head Name (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admission Fee, Computer Lab Fee"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name (नेपाली)</label>
                <input
                  type="text"
                  placeholder="भर्ना शुल्क, कम्युटर शुल्क"
                  value={newHeadNameNepali}
                  onChange={(e) => setNewHeadNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Default Amount (रू)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={newHeadAmount}
                  onChange={(e) => setNewHeadAmount(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSirshakMutation.isPending}
                  className="px-5 py-2 bg-[#1e3a5f] text-white font-bold rounded-xl shadow-xs"
                >
                  {createSirshakMutation.isPending ? 'Saving...' : 'Save Sirshak (थप्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 2. GENERATE MONTHLY FEES MODAL ────────────────────────────────── */}
      {isGenerateMonthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Zap size={16} className="text-amber-500" />
                <span>Generate Monthly Fees (मासिक शुल्क सिर्जना)</span>
              </h3>
              <button onClick={() => setIsGenerateMonthlyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                generateMonthlyFeesMutation.mutate({
                  classId: genClassId,
                  monthBs: genMonthBs,
                  feeHeadId: genFeeHeadId,
                  dueDateBs: genDueDateBs,
                  sendNotice: genSendNotice,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Class (कक्षा) *</label>
                <select
                  value={genClassId}
                  onChange={(e) => setGenClassId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="ALL">ALL CLASSES (सबै कक्षाका विद्यार्थीहरू)</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Head (शुल्क शीर्षक) *</label>
                <select
                  value={genFeeHeadId}
                  onChange={(e) => setGenFeeHeadId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="ALL">ALL ACTIVE FEE HEADS (सबै सक्रिय शुल्क शीर्षकहरू)</option>
                  {feeHeadsData?.map((h: any) => (
                    <option key={h.id} value={h.id}>{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Month BS (महिना) *</label>
                  <input
                    type="text"
                    required
                    placeholder="2083-05"
                    value={genMonthBs}
                    onChange={(e) => setGenMonthBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date BS (भुक्तानी अन्तिम मिति)</label>
                  <input
                    type="text"
                    value={genDueDateBs}
                    onChange={(e) => setGenDueDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={genSendNotice}
                  onChange={(e) => setGenSendNotice(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="font-bold text-purple-900">Send Fee Due Notice & SMS Alert to Parents (अभिभावकलाई सूचना)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsGenerateMonthlyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateMonthlyFeesMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {generateMonthlyFeesMutation.isPending ? 'Generating...' : 'Generate Monthly Dues (सिर्जना गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3. PRINTABLE RECEIPT MODAL ────────────────────────────────────── */}
      {latestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 no-print">
              <span className="font-extrabold text-sm text-[#1e3a5f]">Print Official Fee Receipt</span>
              <div className="flex items-center gap-2">
                <button onClick={triggerFeeReceiptPrint} className="rounded-lg bg-[#1e3a5f] text-white px-3 py-1 text-xs font-bold">
                  Print
                </button>
                <button onClick={() => setLatestReceipt(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="printable-document border-2 border-[#1e3a5f] p-5 rounded-2xl bg-white space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-gray-300 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded-lg border p-1 flex items-center justify-center">
                    {school.logoUrl ? <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <SchoolIcon size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-[#1e3a5f] uppercase">{school.name || 'Nepal Model School'}</h3>
                    <p className="text-[10px] text-gray-600">{school.address || 'Nepal'} • IEMIS: {school.emisCode || 'ABC123'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-[#1e3a5f] text-white font-bold px-2 py-0.5 rounded text-[10px]">FEE RECEIPT</span>
                  <p className="font-mono text-[10px] text-gray-500 mt-0.5">{latestReceipt.receiptNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border text-[11px]">
                <div><span className="text-gray-500">Student Name:</span> <strong className="text-gray-900 block">{latestReceipt.student?.fullName}</strong></div>
                <div><span className="text-gray-500">Date BS:</span> <strong className="text-gray-900 font-mono block">{latestReceipt.paidDateBs}</strong></div>
                <div><span className="text-gray-500">Fee Head:</span> <strong className="text-gray-900 block">{latestReceipt.feeHead?.name}</strong></div>
                <div><span className="text-gray-500">Payment Mode:</span> <strong className="text-purple-800 uppercase block">{latestReceipt.paymentMedium}</strong></div>
              </div>

              <div className="border-t border-b border-gray-300 py-3 flex justify-between items-center font-bold text-sm">
                <span>Total Amount Paid (जम्मा भुक्तानी रकम):</span>
                <span className="font-mono text-emerald-800 text-base">Rs. {latestReceipt.amount?.toLocaleString()}</span>
              </div>

              <div className="pt-6 flex justify-between items-end text-center">
                <div>
                  <div className="w-24 border-b border-gray-400 mx-auto" />
                  <span className="text-[9px] font-bold text-gray-500 uppercase">Received By ({latestReceipt.collectedBy || 'Accountant'})</span>
                </div>
                <div className="h-12 w-12 relative">
                  {school.sealUrl && <img src={school.sealUrl} alt="Seal" className="h-full w-full object-contain opacity-90 rotate-[-5deg]" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. STUDENT LEDGER STATEMENT MODAL ─────────────────────────────── */}
      {ledgerStudentId && (
        <StudentLedgerModal
          studentId={ledgerStudentId}
          isOpen={!!ledgerStudentId}
          onClose={() => setLedgerStudentId(null)}
        />
      )}
    </div>
  );
}

export default function FeeCollectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading Fee Collection Portal...</div>}>
      <FeeCollectionContent />
    </Suspense>
  );
}
