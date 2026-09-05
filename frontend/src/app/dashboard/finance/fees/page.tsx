'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
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
  Coins,
  User,
  BookOpen,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

function FeeCollectionPortalContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab');
  const queryStudentId = searchParams.get('studentId');

  // Active Tab: 'COLLECTION' (Fee Collection & Receipts) | 'RECEIVABLES' (Accounts Receivable / Student Dues)
  const [activeTab, setActiveTab] = useState<'COLLECTION' | 'RECEIVABLES'>(
    queryTab?.toUpperCase() === 'RECEIVABLES' ? 'RECEIVABLES' : 'COLLECTION'
  );

  useEffect(() => {
    if (queryTab?.toUpperCase() === 'RECEIVABLES') {
      setActiveTab('RECEIVABLES');
    } else if (queryTab?.toUpperCase() === 'COLLECTION') {
      setActiveTab('COLLECTION');
    }
  }, [queryTab]);

  // Selected student state for fee collection
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Fee collection form state
  const [selectedFeeHeadId, setSelectedFeeHeadId] = useState('');
  const [totalFeeAmount, setTotalFeeAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [payingAmount, setPayingAmount] = useState('');
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

  // Pay Due Modal State
  const [isPayDueModalOpen, setIsPayDueModalOpen] = useState(false);
  const [selectedDueRecord, setSelectedDueRecord] = useState<any>(null);
  const [duePayAmount, setDuePayAmount] = useState('');
  const [duePaymentMedium, setDuePaymentMedium] = useState('CASH');
  const [duePaymentRef, setDuePaymentRef] = useState('');
  const [dueChequePayeeName, setDueChequePayeeName] = useState('');
  const [duePaidDateBs, setDuePaidDateBs] = useState(todayBS());
  const [dueRemarks, setDueRemarks] = useState('');

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
      if (queryTab?.toUpperCase() === 'RECEIVABLES') {
        setFilterSearch(initialStudentData.fullName || '');
      }
    }
  }, [initialStudentData, queryTab]);

  // Fee Collections History
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['fee-collections-list', filterClassId, filterFeeHeadId],
    queryFn: async () => {
      let url = '/income/fee-collections?limit=200';
      if (filterFeeHeadId !== 'ALL') url += `&feeHeadId=${filterFeeHeadId}`;
      const res = await api.get(url);
      return res.data;
    },
  });

  // Active Academic Year
  const activeYear = schoolProfile?.academicYears?.find((y: any) => y.isActive);

  // ── HELPER: PARSE DUE INFO FROM REMARKS & AMOUNT ───────────────────────────
  const parseDueInfo = (rem: string, paidAmount: number) => {
    const matchTotal = (rem || '').match(/Total:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
    const matchDue = (rem || '').match(/Due:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
    const matchDisc = (rem || '').match(/Disc:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);

    const totalFee = matchTotal ? parseFloat(matchTotal[1].replace(/,/g, '')) : paidAmount;
    const discount = matchDisc ? parseFloat(matchDisc[1].replace(/,/g, '')) : 0;
    const remainingDue = matchDue ? parseFloat(matchDue[1].replace(/,/g, '')) : Math.max(0, totalFee - discount - paidAmount);
    const isDuesCleared = remainingDue <= 0;

    return { totalFee, discount, remainingDue, isDuesCleared };
  };

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  // Auto-fill amount when fee head selected
  const handleFeeHeadSelect = (headId: string) => {
    setSelectedFeeHeadId(headId);
    const head = feeHeadsData?.find((h: any) => h.id.toString() === headId);
    if (head) {
      const stdAmt = head.amount ? head.amount.toString() : '';
      setTotalFeeAmount(stdAmt);
      setPayingAmount(stdAmt);
      setDiscountAmount('0');
    }
  };

  // Live Calculations for Form
  const parsedTotal = parseFloat(totalFeeAmount || '0');
  const parsedDiscount = parseFloat(discountAmount || '0');
  const netPayable = Math.max(0, parsedTotal - parsedDiscount);
  const parsedPaying = parseFloat(payingAmount || '0');
  const liveRemainingDue = Math.max(0, netPayable - parsedPaying);

  // Submit Fee Collection
  const collectFeeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('Please select a student first (कृपया पहिले विद्यार्थी छनोट गर्नुहोस्).');
      if (!selectedFeeHeadId) throw new Error('Please select a Fee Head (शुल्क शीर्षक छनोट गर्नुहोस्).');
      if (parsedTotal <= 0) throw new Error('Please enter valid total fee amount.');
      if (parsedPaying <= 0) throw new Error('Please enter valid amount paid now (हाल बुझाएको रकम).');

      const computedRemarks = `${remarks ? `${remarks} | ` : ''}[Total: Rs. ${parsedTotal} | Disc: Rs. ${parsedDiscount} | Due: Rs. ${liveRemainingDue}]`;

      const payload = {
        studentId: selectedStudent.id,
        feeHeadId: parseInt(selectedFeeHeadId),
        amount: parsedPaying,
        paidDateBs,
        paidDateAd: new Date(),
        academicYearId: activeYear?.id || 1,
        paymentMedium,
        paymentRef,
        chequePayeeName: paymentMedium === 'CHEQUE' ? chequePayeeName : undefined,
        remarks: computedRemarks,
      };

      const res = await api.post('/income/fee-collections', payload);
      return {
        data: res.data?.data,
        totalFee: parsedTotal,
        discount: parsedDiscount,
        paidAmount: parsedPaying,
        remainingDue: liveRemainingDue,
      };
    },
    onSuccess: ({ data, totalFee, discount, paidAmount, remainingDue }) => {
      toast.success(
        remainingDue > 0
          ? `Fee collected! Rs. ${remainingDue.toLocaleString()} remains in due balance.`
          : 'Fee collected successfully & receipt generated!'
      );
      setPrintableReceipt({
        ...data,
        student: selectedStudent,
        feeHead: feeHeadsData?.find((h: any) => h.id.toString() === selectedFeeHeadId),
        totalFee,
        discount,
        remainingDue,
      });

      // Reset collection form
      setSelectedFeeHeadId('');
      setTotalFeeAmount('');
      setDiscountAmount('0');
      setPayingAmount('');
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

  // Pay Remaining Due Mutation (Accounts Receivable Clearance)
  const payDueMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDueRecord) throw new Error('No due record selected');
      const payNum = parseFloat(duePayAmount || '0');
      if (payNum <= 0) throw new Error('Please enter valid payment amount');

      const currentDue = selectedDueRecord.remainingDue || 0;
      const newRemainingDue = Math.max(0, currentDue - payNum);

      const computedRemarks = `${dueRemarks ? `${dueRemarks} | ` : ''}[Total: Rs. ${selectedDueRecord.totalFee} | Prev Paid: Rs. ${selectedDueRecord.amount} | Due Clearance: Rs. ${payNum} | Due: Rs. ${newRemainingDue}] (Ref Receipt: ${selectedDueRecord.receiptNo})`;

      const payload = {
        studentId: selectedDueRecord.studentId,
        feeHeadId: selectedDueRecord.feeHeadId,
        amount: payNum,
        paidDateBs: duePaidDateBs,
        paidDateAd: new Date(),
        academicYearId: activeYear?.id || 1,
        paymentMedium: duePaymentMedium,
        paymentRef: duePaymentRef,
        chequePayeeName: duePaymentMedium === 'CHEQUE' ? dueChequePayeeName : undefined,
        previousReceiptId: selectedDueRecord.id,
        remarks: computedRemarks,
      };

      const res = await api.post('/income/fee-collections', payload);
      return { data: res.data?.data, originalDue: selectedDueRecord, payNum, newRemainingDue };
    },
    onSuccess: ({ data, originalDue, payNum, newRemainingDue }) => {
      toast.success(
        newRemainingDue === 0
          ? '🎉 Due completely cleared! Official Clearance Receipt generated.'
          : `Partial due payment recorded! Remaining Due: Rs. ${newRemainingDue.toLocaleString()}`
      );
      setIsPayDueModalOpen(false);
      setSelectedDueRecord(null);
      setDuePayAmount('');
      setDuePaymentRef('');
      setDueRemarks('');

      // Show receipt for this due clearance
      setPrintableReceipt({
        ...data,
        student: originalDue.student,
        feeHead: originalDue.feeHead,
        totalFee: originalDue.totalFee,
        discount: originalDue.discount || 0,
        amount: payNum,
        remainingDue: newRemainingDue,
      });

      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['fee-collections-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to record due payment'),
  });

  const handleOpenPayDueModal = (dueItem: any) => {
    setSelectedDueRecord(dueItem);
    setDuePayAmount(dueItem.remainingDue.toString());
    setDuePaidDateBs(todayBS());
    setDuePaymentMedium('CASH');
    setDuePaymentRef('');
    setDueRemarks(`Settlement for Due of ${dueItem.feeHead?.name || 'Fee'}`);
    setIsPayDueModalOpen(true);
  };

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

  // Direct POST Delete Fee Collection Mutation
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

  // Process & Filter collections
  const rawCollections = collectionsData?.data || [];

  const processedCollections = useMemo(() => {
    return rawCollections.map((c: any) => {
      const dueInfo = parseDueInfo(c.remarks, c.amount);
      return {
        ...c,
        totalFee: dueInfo.totalFee,
        discount: dueInfo.discount,
        remainingDue: dueInfo.remainingDue,
        isDuesCleared: dueInfo.isDuesCleared,
      };
    });
  }, [rawCollections]);

  // Filtered for Collection History Table
  const filteredCollections = processedCollections.filter((c: any) => {
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

  // Filtered for Accounts Receivable (Pending Dues Table)
  // Shows only the latest active outstanding balance per student & fee head.
  // Once the due is completely cleared (remainingDue <= 0), it is removed from the list.
  const pendingDuesList = useMemo(() => {
    // Sort descending by id so the newest transaction for each student + fee head is checked first
    const sorted = [...processedCollections].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    const latestByStudentHead = new Map<string, any>();

    for (const c of sorted) {
      const key = `${c.studentId}_${c.feeHeadId}`;
      if (!latestByStudentHead.has(key)) {
        latestByStudentHead.set(key, c);
      }
    }

    return Array.from(latestByStudentHead.values()).filter((c: any) => {
      // Must not be cleared and remainingDue must be > 0
      if (c.isDuesCleared || (c.remainingDue || 0) <= 0) return false;
      if (filterClassId !== 'ALL' && c.student?.classEnrollments?.[0]?.classId?.toString() !== filterClassId) return false;
      if (filterFeeHeadId !== 'ALL' && c.feeHeadId?.toString() !== filterFeeHeadId) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const matchName = c.student?.fullName?.toLowerCase().includes(q);
        const matchReceipt = c.receiptNo?.toLowerCase().includes(q);
        const matchHead = c.feeHead?.name?.toLowerCase().includes(q);
        if (!matchName && !matchReceipt && !matchHead) return false;
      }
      return true;
    });
  }, [processedCollections, filterClassId, filterFeeHeadId, filterSearch]);

  const totalOutstandingReceivables = pendingDuesList.reduce((sum: number, item: any) => sum + (item.remainingDue || 0), 0);
  const totalStudentsWithDues = new Set(pendingDuesList.map((d: any) => d.studentId)).size;
  const totalCollectedRevenue = processedCollections.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  // ── PRINT OFFICIAL RECEIPT FUNCTION ─────────────────────────────────────────
  const triggerPrintReceipt = (receipt: any) => {
    if (!receipt) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const r = receipt;
    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || schoolProfile?.name || 'श्री नेपाल माध्यमिक विद्यालय';
    const sNameEn = schoolProfile?.schoolName || schoolProfile?.name || 'Shree Nepal Secondary School';
    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';

    const studentName = r.student?.fullName || r.studentName || 'Student';
    const studentId = r.student?.studentId || r.studentId || '—';
    const classInfo = r.student?.classEnrollments?.[0]?.class?.name || selectedStudent?.classEnrollments?.[0]?.class?.name || '—';
    const rollNo = r.student?.classEnrollments?.[0]?.rollNo || selectedStudent?.classEnrollments?.[0]?.rollNo || '—';
    const feeHeadName = r.feeHead?.name || 'Fee Collection';

    // Parse amounts & remaining dues
    const paidAmount = r.amount ? parseFloat(r.amount) : 0;
    let totalFee = r.totalFee !== undefined ? r.totalFee : paidAmount;
    let discount = r.discount || 0;
    let remainingDue = r.remainingDue !== undefined ? r.remainingDue : 0;

    const parsed = parseDueInfo(r.remarks, paidAmount);
    if (r.totalFee === undefined) {
      totalFee = parsed.totalFee;
      discount = parsed.discount;
      remainingDue = parsed.remainingDue;
    }

    const isDuesCleared = remainingDue <= 0;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Fee Receipt - ${r.receiptNo || 'Receipt'}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #1e3a5f; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 16px; border-radius: 8px; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; margin: 0; }
            .school-sub { font-size: 10px; font-weight: bold; color: #475569; margin-top: 2px; }
            .receipt-title { display: inline-block; background: #1e3a5f; color: #fff; padding: 3px 14px; font-weight: 900; font-size: 11px; border-radius: 4px; text-transform: uppercase; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
            .due-status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 10.5px; }
            .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 class="school-name">${sNameNp}</h1>
              <div class="school-sub">${sNameEn}, ${sAddress}</div>
              <div class="receipt-title">OFFICIAL FEE RECEIPT (शुल्क भुक्तानी रसिद)</div>
            </div>

            <div class="grid">
              <div><strong>RECEIPT NO:</strong> <span style="font-family: monospace; font-weight: bold;">${r.receiptNo || 'RCP-2026'}</span></div>
              <div><strong>DATE (BS):</strong> <span style="font-family: monospace; font-weight: bold;">${r.paidDateBs || todayBS()}</span></div>
              <div><strong>STUDENT NAME:</strong> ${studentName}</div>
              <div><strong>CLASS & ROLL:</strong> ${classInfo} (Roll: ${rollNo})</div>
              <div><strong>STUDENT ID / EMIS:</strong> <span style="font-family: monospace;">${studentId}</span></div>
              <div><strong>PAYMENT METHOD:</strong> ${r.paymentMedium || 'CASH'} ${r.paymentRef ? `(Ref: ${r.paymentRef})` : ''}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N</th>
                  <th>FEE HEAD & PARTICULARS (शुल्क शीर्षक)</th>
                  <th style="text-align: right; width: 110px;">TOTAL FEE</th>
                  <th style="text-align: right; width: 110px;">PAID NOW (रू)</th>
                  <th style="text-align: right; width: 130px;">REMAINING DUES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>
                    <strong>${feeHeadName}</strong>
                    ${discount > 0 ? `<div style="font-size: 9px; color: #666;">Scholarship / Discount: रू ${discount.toLocaleString()}</div>` : ''}
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold;">रू ${totalFee.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #047857;">रू ${paidAmount.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${isDuesCleared ? '#047857' : '#b91c1c'};">
                    ${isDuesCleared ? '0 (चुक्ता भएको)' : `रू ${remainingDue.toLocaleString()}`}
                  </td>
                </tr>
                <tr style="background: ${isDuesCleared ? '#ecfdf5' : '#fffbeb'}; border-top: 1.5px solid #1e3a5f;">
                  <td colspan="3" style="text-align: right; font-weight: bold;">
                    ${isDuesCleared ? 'DUES STATUS (शुल्क स्थिति):' : 'CURRENT SETTLEMENT STATUS:'}
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #047857; font-size: 12px;">
                    रू ${paidAmount.toLocaleString()}
                  </td>
                  <td style="text-align: right;">
                    <span class="due-status" style="background: ${isDuesCleared ? '#a7f3d0' : '#fed7aa'}; color: ${isDuesCleared ? '#065f46' : '#9a3412'};">
                      ${isDuesCleared ? '✓ DUES CLEARED (चुक्ता भएको)' : `⚡ रू ${remainingDue.toLocaleString()} DUE (बाँकी बक्यौता)`}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">
              * Narration: ${r.remarks || 'Thank you for the timely fee payment. Keep this receipt safe for your records.'}
            </div>

            <div class="footer">
              <div class="sig">Payer / Guardian Signature</div>
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
                Student Fee Collection & Accounts Receivable (विद्यार्थी शुल्क संकलन तथा बक्यौता)
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Record student fees, manage dues & receivables, and issue official printable vouchers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              queryClient.clear();
              queryClient.invalidateQueries();
              toast.success('System cache refreshed!');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <RefreshCw size={14} className="text-blue-600" />
            <span>Refresh Data</span>
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

      {/* ── TOP LEVEL SUMMARY METRICS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Collected Revenue (कुल संकलित शुल्क)</span>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">रू {totalCollectedRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">{processedCollections.length} Collection Receipts Issued</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Total Outstanding Dues (बाँकी प्राप्त गर्नुपर्ने रकम)</span>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2 font-mono">रू {totalOutstandingReceivables.toLocaleString()}</p>
          <p className="text-[11px] text-amber-700 font-bold mt-1">{pendingDuesList.length} Pending Unpaid Dues</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Students with Dues (बक्यौता बाँकी विद्यार्थी)</span>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#1e3a5f] mt-2 font-mono">{totalStudentsWithDues} Students</p>
          <p className="text-[11px] text-gray-400 mt-1">Accounts Receivable (विद्यार्थी खाता)</p>
        </div>
      </div>

      {/* ── SECTION TABS ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 bg-white px-3 pt-2 rounded-t-2xl shadow-2xs">
        <button
          onClick={() => setActiveTab('COLLECTION')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'COLLECTION'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt size={16} />
          <span>Fee Collection & History (शुल्क संकलन तथा रसिदहरू)</span>
        </button>

        <button
          onClick={() => setActiveTab('RECEIVABLES')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'RECEIVABLES'
              ? 'border-amber-600 text-amber-900 bg-amber-50/60 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertCircle size={16} className="text-amber-600" />
          <span>Accounts Receivable — Student Dues (विद्यार्थी बाँकी बक्यौता)</span>
          {pendingDuesList.length > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500 text-white px-2 py-0.2 text-[10px] font-black font-mono">
              {pendingDuesList.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: FEE COLLECTION & HISTORY ─────────────────────────────────── */}
      {activeTab === 'COLLECTION' && (
        <div className="space-y-6">
          {/* Top Section: Collect Fee Form & Student Search */}
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

                {/* Student Search Dropdown */}
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
                    <Coins className="text-emerald-600" size={18} />
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

                  {/* Total Standard Fee Amount */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Fee Amount (नियम अनुसार कुल शुल्क) *
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={totalFeeAmount}
                      onChange={(e) => setTotalFeeAmount(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Discount / Scholarship */}
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

                  {/* Amount Paid Now (Partial Payment Support) */}
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200">
                    <label className="block text-xs font-extrabold text-emerald-950 mb-1">
                      Amount Paid Now (हाल बुझाएको रकम) *
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={payingAmount}
                      onChange={(e) => setPayingAmount(e.target.value)}
                      className="w-full rounded-lg border border-emerald-400 bg-white p-2 text-xs font-mono font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center justify-between mt-1 text-[10px] font-bold">
                      <span className="text-gray-500">Remaining Due (बाँकी):</span>
                      <span className={liveRemainingDue > 0 ? 'text-amber-700 font-mono font-black' : 'text-emerald-700 font-mono font-black'}>
                        {liveRemainingDue > 0 ? `⚡ रू ${liveRemainingDue.toLocaleString()} DUE` : '✓ चुक्ता (Cleared)'}
                      </span>
                    </div>
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

                  {/* Cheque Payee Name (Shown if Cheque selected) */}
                  {paymentMedium === 'CHEQUE' && (
                    <div className="sm:col-span-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Cheque Issued To / Account Payee Name (खातावालाको नाम)
                      </label>
                      <input
                        type="text"
                        placeholder="Account Holder / Payee Name..."
                        value={chequePayeeName}
                        onChange={(e) => setChequePayeeName(e.target.value)}
                        className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs font-medium"
                      />
                    </div>
                  )}

                  {/* Paid Date BS */}
                  <div className="sm:col-span-2">
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
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500">Total Net Fee: <strong className="text-gray-800 font-mono">रू {netPayable.toLocaleString()}</strong></span>
                      <span className="text-gray-500">Paying Now: <strong className="text-emerald-700 font-mono">रू {parsedPaying.toLocaleString()}</strong></span>
                    </div>
                    {liveRemainingDue > 0 ? (
                      <span className="inline-block text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        ⚡ Due Remaining to Receive: रू {liveRemainingDue.toLocaleString()}
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Full Clearance Payment (पूर्ण भुक्तानी)
                      </span>
                    )}
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
                <p className="text-xs text-gray-500">View, print, edit or delete fee collection records</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                    <th className="p-3 text-right">Total Fee (रू)</th>
                    <th className="p-3 text-right">Paid Now (रू)</th>
                    <th className="p-3 text-right">Remaining Due</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingCollections ? (
                    <tr><td colSpan={9} className="p-6 text-center text-gray-400">Loading fee receipts history...</td></tr>
                  ) : filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">
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
                        <td className="p-3 text-right font-mono font-bold text-gray-800">Rs. {c.totalFee?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">Rs. {c.amount?.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          {c.isDuesCleared ? (
                            <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                              ✓ Cleared
                            </span>
                          ) : (
                            <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black font-mono">
                              ⚡ Rs. {c.remainingDue?.toLocaleString()} Due
                            </span>
                          )}
                        </td>
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
        </div>
      )}

      {/* ── TAB 2: ACCOUNTS RECEIVABLE — STUDENT DUES (विद्यार्थी बाँकी बक्यौता) ──── */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-600" />
                  <span>Student Fee Receivables Register (विद्यार्थी बाँकी बक्यौता रजिष्टर)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Track students with outstanding fee balances, view dues history and collect remaining dues
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                    placeholder="Search student or ID..."
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
                    <th className="p-3">Ref Receipt</th>
                    <th className="p-3">Date (BS)</th>
                    <th className="p-3">Student Name & EMIS</th>
                    <th className="p-3">Fee Head</th>
                    <th className="p-3 text-right">Total Fee (रू)</th>
                    <th className="p-3 text-right">Paid Amount (रू)</th>
                    <th className="p-3 text-right text-amber-300">Outstanding Due (बाँकी रू)</th>
                    <th className="p-3 text-center">Due Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingDuesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-gray-700">All Student Dues are Cleared!</p>
                        <p className="text-xs text-gray-400 mt-0.5">कुनै पनि विद्यार्थीको बक्यौता बाँकी छैन।</p>
                      </td>
                    </tr>
                  ) : (
                    pendingDuesList.map((d: any) => (
                      <tr key={d.id} className="hover:bg-amber-50/40">
                        <td className="p-3 font-mono font-bold text-[#1e3a5f]">{d.receiptNo}</td>
                        <td className="p-3 font-mono">{d.paidDateBs}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-gray-900">{d.student?.fullName}</p>
                          <p className="text-[10px] text-gray-500 font-mono">ID: {d.student?.studentId || '—'}</p>
                        </td>
                        <td className="p-3 font-bold text-gray-800">{d.feeHead?.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">Rs. {d.totalFee?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">Rs. {d.amount?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-amber-900 bg-amber-50/80">
                          Rs. {d.remainingDue?.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-extrabold border border-amber-300">
                            ⚡ DUE REMAINING
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleOpenPayDueModal(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-extrabold shadow-sm transition"
                          >
                            <Receipt size={13} />
                            <span>Pay Remaining Due (बाँकी भुक्तानी)</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAY REMAINING DUE MODAL ─────────────────────────────────────────── */}
      {isPayDueModalOpen && selectedDueRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Coins className="text-emerald-600" size={18} />
                <span>Clear Student Fee Due (बाँकी विद्यार्थी शुल्क भुक्तानी)</span>
              </h3>
              <button onClick={() => setIsPayDueModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Student & Due Summary Banner */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">Student:</span>
                <span className="font-extrabold text-gray-900">{selectedDueRecord.student?.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">Fee Head:</span>
                <span className="font-bold text-[#1e3a5f]">{selectedDueRecord.feeHead?.name}</span>
              </div>
              <div className="flex items-center justify-between border-t border-amber-200/80 pt-1.5">
                <span className="text-gray-600 font-bold">Total Original Fee:</span>
                <span className="font-mono font-bold text-gray-800">रू {selectedDueRecord.totalFee?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">Previously Paid:</span>
                <span className="font-mono font-bold text-emerald-700">रू {selectedDueRecord.amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-100/70 p-2 rounded-lg border border-amber-300 font-extrabold text-amber-950">
                <span>Current Outstanding Due (बाँकी बक्यौता):</span>
                <span className="font-mono text-sm">रू {selectedDueRecord.remainingDue?.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1">
                  Amount Paying Now (अहिले बुझाउने रकम) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={duePayAmount}
                  onChange={(e) => setDuePayAmount(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500 p-2.5 text-sm font-mono font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={duePaymentMedium}
                    onChange={(e) => setDuePaymentMedium(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs bg-white font-bold"
                  >
                    <option value="CASH">💵 Cash (नगद)</option>
                    <option value="BANK_TRANSFER">🏛️ Bank Transfer</option>
                    <option value="CHEQUE">💳 Cheque (चेक)</option>
                    <option value="QR_CODE">📱 QR Code</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Date (मिति)</label>
                  <input
                    type="text"
                    value={duePaidDateBs}
                    onChange={(e) => setDuePaidDateBs(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ref / Cheque No (यदि छ भने)</label>
                <input
                  type="text"
                  placeholder="Txn ID / Cheque No..."
                  value={duePaymentRef}
                  onChange={(e) => setDuePaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={dueRemarks}
                  onChange={(e) => setDueRemarks(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                onClick={() => setIsPayDueModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => payDueMutation.mutate()}
                disabled={payDueMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
              >
                {payDueMutation.isPending ? 'Processing...' : 'Submit Payment & Issue Clearance Receipt (भुक्तानी सेभ गर्नुहोस्)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT RECEIPT MODAL ────────────────────────────────────────────── */}
      {printableReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <span>Official Fee Receipt Generated</span>
              </h3>
              <button onClick={() => setPrintableReceipt(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
              <p className="text-base font-black text-emerald-950">
                {printableReceipt.receiptNo}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold text-gray-700 pt-2 border-t border-emerald-200/60">
                <div>Paid Now: <span className="text-emerald-700 font-extrabold">रू {(printableReceipt.amount || 0).toLocaleString()}</span></div>
                <div>Remaining Due: <span className={printableReceipt.remainingDue > 0 ? 'text-amber-800 font-black' : 'text-emerald-700 font-black'}>
                  {printableReceipt.remainingDue > 0 ? `रू ${printableReceipt.remainingDue.toLocaleString()}` : '0 (Cleared)'}
                </span></div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setPrintableReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => triggerPrintReceipt(printableReceipt)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#1e3a5f] text-white hover:bg-[#2a5280] shadow-md"
              >
                <Printer size={14} />
                <span>Print Official Receipt (प्रिन्ट रसिद)</span>
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
                  placeholder="e.g. Monthly Tuition Fee, Computer Lab Fee, Tie Fee..."
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Default Standard Amount (रू)</label>
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
