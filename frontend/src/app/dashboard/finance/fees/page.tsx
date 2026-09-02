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
  Edit2,
  Trash2,
  RefreshCw,
  UserCheck,
  CreditCard,
  CheckCircle2,
  X,
  FileText,
  Building,
  Filter,
  DollarSign,
  User,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

function FeeCollectionPortalContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryStudentId = searchParams.get('studentId');

  // Selected student state for fee collection
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Fee collection form state
  const [selectedFeeHeadId, setSelectedFeeHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paidDateBs, setPaidDateBs] = useState(todayBS());
  const [paymentMedium, setPaymentMedium] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [chequePayeeName, setChequePayeeName] = useState('');
  const [remarks, setRemarks] = useState('');

  // Table filters & state
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [filterFeeHeadId, setFilterFeeHeadId] = useState('ALL');
  const [filterSearch, setFilterSearch] = useState('');

  // Print modal / Edit modal state
  const [printableReceipt, setPrintableReceipt] = useState<any>(null);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [isAddSirshakOpen, setIsAddSirshakOpen] = useState(false);

  // New Fee Head Inline Form
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadAmount, setNewHeadAmount] = useState('');

  // ── DATA FETCHING ──────────────────────────────────────────────────────────

  // Active School Profile
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Active Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fee Heads
  const { data: feeHeadsData } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: async () => {
      const res = await api.get('/income/fee-heads');
      return res.data?.data || [];
    },
  });

  // Search Students
  const { data: studentSearchResults } = useQuery({
    queryKey: ['students-search-fee', studentSearchQuery],
    queryFn: async () => {
      if (!studentSearchQuery || studentSearchQuery.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(studentSearchQuery)}`);
      return res.data?.data || [];
    },
    enabled: studentSearchQuery.length >= 2,
  });

  // Auto-fetch student if studentId is provided in URL
  const { data: initialStudentData } = useQuery({
    queryKey: ['student-fee-initial', queryStudentId],
    queryFn: async () => {
      if (!queryStudentId) return null;
      const res = await api.get(`/students/${queryStudentId}`);
      return res.data?.data || null;
    },
    enabled: !!queryStudentId,
  });

  useEffect(() => {
    if (initialStudentData) {
      setSelectedStudent(initialStudentData);
    }
  }, [initialStudentData]);

  // Fee Collections History
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['fee-collections-list', filterClassId, filterFeeHeadId],
    queryFn: async () => {
      let url = '/income/fee-collections?limit=100';
      if (filterFeeHeadId !== 'ALL') url += `&feeHeadId=${filterFeeHeadId}`;
      const res = await api.get(url);
      return res.data;
    },
  });

  // Active Academic Year
  const activeYear = schoolProfile?.academicYears?.find((y: any) => y.isActive);

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  // Auto-fill amount when fee head selected
  const handleFeeHeadSelect = (headId: string) => {
    setSelectedFeeHeadId(headId);
    const head = feeHeadsData?.find((h: any) => h.id.toString() === headId);
    if (head) {
      setAmount(head.amount ? head.amount.toString() : '');
    }
  };

  // Submit Fee Collection
  const collectFeeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('Please select a student first.');
      if (!selectedFeeHeadId) throw new Error('Please select a Fee Head (शुल्क शीर्षक).');
      if (!amount || parseFloat(amount) <= 0) throw new Error('Please enter a valid amount.');

      const netAmount = Math.max(0, parseFloat(amount) - parseFloat(discountAmount || '0'));

      const payload = {
        studentId: selectedStudent.id,
        feeHeadId: parseInt(selectedFeeHeadId),
        amount: netAmount,
        paidDateBs,
        paidDateAd: new Date(),
        academicYearId: activeYear?.id || 1,
        paymentMedium,
        paymentRef,
        chequePayeeName: paymentMedium === 'CHEQUE' ? chequePayeeName : undefined,
        remarks,
      };

      const res = await api.post('/income/fee-collections', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Fee collected successfully & receipt generated!');
      setPrintableReceipt(data.data);
      // Reset collection form
      setSelectedFeeHeadId('');
      setAmount('');
      setDiscountAmount('0');
      setPaymentRef('');
      setChequePayeeName('');
      setRemarks('');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['fee-collections-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to collect fee.');
    },
  });

  // Edit Fee Collection Mutation
  const updateFeeCollectionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/income/fee-collections/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Fee receipt updated successfully!');
      setEditingCollection(null);
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['fee-collections-list'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update fee record.'),
  });

  // Direct POST Delete Fee Collection Mutation (100% Reliable, Proxy-Proof — POST only)
  const deleteFeeCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post('/income/fee-collections-delete-direct', { id });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Fee collection record deleted successfully.');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['fee-collections-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to delete fee record.'),
  });

  // Create Fee Head Inline Mutation
  const createFeeHeadMutation = useMutation({
    mutationFn: async () => {
      if (!newHeadName) throw new Error('Please enter fee head name');
      const res = await api.post('/income/fee-heads', {
        name: newHeadName,
        amount: parseFloat(newHeadAmount || '0'),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Fee Head created successfully!');
      setNewHeadName('');
      setNewHeadAmount('');
      setIsAddSirshakOpen(false);
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create Fee Head.'),
  });

  // Filter collections
  const rawCollections = collectionsData?.data || [];
  const filteredCollections = rawCollections.filter((c: any) => {
    if (filterClassId !== 'ALL' && c.student?.classEnrollments?.[0]?.classId?.toString() !== filterClassId) {
      return false;
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matchName = c.student?.fullName?.toLowerCase().includes(q);
      const matchReceipt = c.receiptNo?.toLowerCase().includes(q);
      const matchHead = c.feeHead?.name?.toLowerCase().includes(q);
      if (!matchName && !matchReceipt && !matchHead) return false;
    }
    return true;
  });

  // Print Official Receipt Function
  const triggerPrintReceipt = (receipt: any) => {
    if (!receipt) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const r = receipt;
    const studentName = r.student?.fullName || 'Student';
    const studentId = r.student?.studentId || r.studentId || '—';
    const feeHeadName = r.feeHead?.name || 'Fee Collection';
    const amountVal = r.amount ? parseFloat(r.amount).toLocaleString() : '0';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${r.receiptNo || 'Receipt'}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #1e3a5f; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 16px; border-radius: 8px; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; margin: 0; }
            .school-sub { font-size: 9.5px; color: #475569; margin-top: 2px; }
            .receipt-title { display: inline-block; background: #1e3a5f; color: #fff; padding: 3px 12px; font-weight: 900; font-size: 11px; border-radius: 4px; uppercase; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
            .total-row { background: #ecfdf5; font-weight: 900; font-size: 12px; color: #047857; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 class="school-name">${schoolProfile?.name || 'SHREE NEPAL SECONDARY SCHOOL'}</h1>
              <div class="school-sub">${schoolProfile?.address || 'Nepal'} ${schoolProfile?.emisCode ? `| EMIS Code: ${schoolProfile.emisCode}` : ''}</div>
              <div class="receipt-title">FEE RECEIPT (भुक्तानी रसिद)</div>
            </div>

            <div class="grid">
              <div><strong>RECEIPT NO:</strong> ${r.receiptNo || 'RCP-2026'}</div>
              <div><strong>DATE BS:</strong> ${r.paidDateBs || todayBS()}</div>
              <div><strong>STUDENT NAME:</strong> ${studentName}</div>
              <div><strong>STUDENT ID / EMIS:</strong> ${studentId}</div>
              <div><strong>PAYMENT METHOD:</strong> ${r.paymentMedium || 'CASH'}</div>
              <div><strong>COLLECTED BY:</strong> ${r.collectedBy || 'Accountant'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>S.N</th>
                  <th>FEE HEAD / PARTICULAR (शुल्क शीर्षक)</th>
                  <th style="text-align: right;">AMOUNT (रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>${feeHeadName}</td>
                  <td style="text-align: right; font-family: monospace;">Rs. ${amountVal}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2" style="text-align: right;">NET RECEIVED AMOUNT (जम्मा भुक्तानी):</td>
                  <td style="text-align: right; font-family: monospace;">Rs. ${amountVal}</td>
                </tr>
              </tbody>
            </table>

            <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">
              * Note: ${r.remarks || 'Thank you for your payment. Keep this receipt safe for your records.'}
            </div>

            <div class="footer">
              <div class="sig">Payer Signature</div>
              <div class="sig">Authorized Signature (लेखापाल)</div>
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 300); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#1e3a5f] p-2 text-white shadow-md">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
                Student Fee Collection Hub (विद्यार्थी शुल्क संकलन)
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Record student fees, issue instant printable vouchers & manage fee structures
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              queryClient.clear();
              queryClient.invalidateQueries();
              toast.success('System cache cleared & refreshed!');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-50 shadow-2xs transition"
            title="Purge browser memory and fetch fresh database records"
          >
            <RefreshCw size={14} className="text-blue-600" />
            <span>Clear Cache & Refresh</span>
          </button>

          <button
            onClick={() => setIsAddSirshakOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus size={14} />
            <span>Add Fee Head (नयाँ शुल्क शीर्षक)</span>
          </button>
        </div>
      </div>

      {/* ── TOP SECTION: COLLECT FEE FORM & STUDENT SEARCH ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Student Selection Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-linear-to-b from-blue-50/60 to-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
              <UserCheck className="text-blue-700" size={18} />
              <h2 className="text-sm font-bold text-[#1e3a5f]">
                1. Select Student (विद्यार्थी छनोट गर्नुहोस्)
              </h2>
            </div>

            {/* Student Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Type student name or ID (min 2 chars)..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Student Search Dropdown / Results */}
            {studentSearchQuery.length >= 2 && studentSearchResults && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
                {studentSearchResults.length === 0 ? (
                  <p className="p-3 text-xs text-gray-400 text-center">No students found matching "{studentSearchQuery}"</p>
                ) : (
                  studentSearchResults.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentSearchQuery('');
                      }}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900">{s.fullName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">ID: {s.studentId || 'N/A'}</p>
                      </div>
                      <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                        Select
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Selected Student Banner */}
            {selectedStudent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 relative">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-rose-600 p-1"
                  title="Remove selected student"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {selectedStudent.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-emerald-950">{selectedStudent.fullName}</p>
                    <p className="text-xs text-emerald-800 font-mono">Student ID: {selectedStudent.studentId || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60 text-emerald-900 font-medium">
                  <div>Father: {selectedStudent.fatherName || 'N/A'}</div>
                  <div>Phone: {selectedStudent.guardianContact || selectedStudent.phone || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-400">
                <User size={24} className="mx-auto mb-1 text-gray-300" />
                <p className="text-xs font-semibold">No student selected yet</p>
                <p className="text-[10px] mt-0.5">Search student name above to record fee payment</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col (7 cols): Fee Collection Entry Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="text-emerald-600" size={18} />
                <h2 className="text-sm font-bold text-[#1e3a5f]">
                  2. Fee Payment & Voucher Details (शुल्क भुक्तानी फारम)
                </h2>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 font-mono">
                {paidDateBs}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fee Head Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fee Head (शुल्क शीर्षक) *</label>
                <select
                  value={selectedFeeHeadId}
                  onChange={(e) => handleFeeHeadSelect(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Fee Head --</option>
                  {feeHeadsData?.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.amount ? `(Rs. ${h.amount})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fee Amount (नियम अनुसार रकम) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discount / Scholarship Adjustment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Discount / Waiver (छुट रकम)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono text-gray-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Medium */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method (भुक्तानी माध्यम)</label>
                <select
                  value={paymentMedium}
                  onChange={(e) => setPaymentMedium(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white font-bold text-blue-900"
                >
                  <option value="CASH">💵 Cash (नगद)</option>
                  <option value="BANK_TRANSFER">🏛️ Bank Transfer / Mobile Banking</option>
                  <option value="CHEQUE">💳 Cheque (चेक)</option>
                  <option value="QR_CODE">📱 QR Code Payment</option>
                </select>
              </div>

              {/* Cheque Payee Name (Shown if Cheque selected) */}
              {paymentMedium === 'CHEQUE' && (
                <div className="sm:col-span-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Cheque Issued To / Account Payee Name (खातावालाको नाम)
                  </label>
                  <input
                    type="text"
                    placeholder="Account Holder / Payee Name if different from shop/school..."
                    value={chequePayeeName}
                    onChange={(e) => setChequePayeeName(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs font-medium"
                  />
                </div>
              )}

              {/* Transaction / Cheque Ref No */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ref / Cheque No (यदि छ भने)</label>
                <input
                  type="text"
                  placeholder="Txn ID / Cheque No..."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                />
              </div>

              {/* Paid Date BS */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Paid Date BS (मिति)</label>
                <input
                  type="text"
                  value={paidDateBs}
                  onChange={(e) => setPaidDateBs(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
              <input
                type="text"
                placeholder="Optional notes or month period..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs"
              />
            </div>

            {/* Net Amount & Submit Button */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Payable Amount</span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  Rs. {Math.max(0, parseFloat(amount || '0') - parseFloat(discountAmount || '0')).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => collectFeeMutation.mutate()}
                disabled={collectFeeMutation.isPending || !selectedStudent}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-xs font-extrabold shadow-md disabled:opacity-50 transition"
              >
                <CheckCircle2 size={16} />
                <span>{collectFeeMutation.isPending ? 'Processing...' : 'Collect Fee & Issue Receipt (भुक्तानी सेभ गर्नुहोस्)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT FEE RECEIPTS TABLE ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1e3a5f] uppercase tracking-wider">
              Recent Fee Collection History (हालैका भुक्तानी रसिदहरू)
            </h2>
            <p className="text-xs text-gray-500">View, print, edit or delete fee receipts</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterFeeHeadId}
              onChange={(e) => setFilterFeeHeadId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-1.5 text-xs font-medium"
            >
              <option value="ALL">All Fee Heads (सबै शीर्षक)</option>
              {feeHeadsData?.map((h: any) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Filter by student/receipt..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-1 text-xs"
              />
            </div>
          </div>
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
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingCollections ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">Loading fee receipts history...</td></tr>
              ) : filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <Receipt size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold">No fee receipts found</p>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#1e3a5f]">{c.receiptNo}</td>
                    <td className="p-3 font-mono">{c.paidDateBs}</td>
                    <td className="p-3 font-bold text-gray-900">{c.student?.fullName || 'Student'}</td>
                    <td className="p-3 text-gray-700 font-medium">{c.feeHead?.name || 'Fee'}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">Rs. {c.amount?.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[11px] uppercase">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {c.paymentMedium || 'CASH'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => triggerPrintReceipt(c)}
                          className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[11px] font-black shadow-2xs transition"
                          title="Print Receipt"
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>

                        <button
                          onClick={() => setEditingCollection(c)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                          title="Edit Receipt"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete receipt "${c.receiptNo}"?`)) {
                              deleteFeeCollectionMutation.mutate(c.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                          title="Delete Receipt"
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

      {/* ── PRINT RECEIPT MODAL ────────────────────────────────────────────── */}
      {printableReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">Receipt Generated</h3>
              <button onClick={() => setPrintableReceipt(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
              <p className="text-sm font-bold text-emerald-900">
                Receipt {printableReceipt.receiptNo}
              </p>
              <p className="text-xs text-emerald-700 font-mono font-bold">
                Amount Paid: Rs. {printableReceipt.amount?.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPrintableReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => triggerPrintReceipt(printableReceipt)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e3a5f] text-white hover:bg-[#2a5280]"
              >
                Print Printable Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD FEE HEAD MODAL ──────────────────────────────────────────────── */}
      {isAddSirshakOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">Add New Fee Head (नयाँ शीर्षक)</h3>
              <button onClick={() => setIsAddSirshakOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fee Head Name (शीर्षकको नाम) *</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Tuition Fee, Computer Lab Fee..."
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Default Amount (रू)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newHeadAmount}
                  onChange={(e) => setNewHeadAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsAddSirshakOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => createFeeHeadMutation.mutate()}
                disabled={createFeeHeadMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {createFeeHeadMutation.isPending ? 'Creating...' : 'Create Fee Head'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeeCollectionPortal() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-gray-500">Loading Fee Collection Portal...</div>}>
      <FeeCollectionPortalContent />
    </Suspense>
  );
}
