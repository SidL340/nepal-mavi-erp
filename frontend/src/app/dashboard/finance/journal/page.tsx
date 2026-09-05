'use client';

import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  FileText,
  Printer,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  X,
  School as SchoolIcon,
  Stamp,
  Calendar,
  CheckCircle2,
  Landmark,
  DollarSign,
  QrCode,
  CreditCard,
  Download,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JournalVoucherPage() {
  const [viewMode, setViewMode] = useState<'SEPARATE' | 'COMBINED' | 'PARTY_WISE'>('COMBINED');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'FEE' | 'PAYROLL'>('ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [partyWiseSelectedId, setPartyWiseSelectedId] = useState<string>('ALL');

  // Modals
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [isPrintLedgerOpen, setIsPrintLedgerOpen] = useState(false);

  // Fetch School Profile for Header & Seal
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
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

  // Fetch Income Entries
  const { data: incomeData } = useQuery({
    queryKey: ['income-entries-journal'],
    queryFn: async () => {
      const res = await api.get('/income/entries?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch Expense Entries
  const { data: expenseData } = useQuery({
    queryKey: ['expense-entries-journal'],
    queryFn: async () => {
      const res = await api.get('/expense/entries?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch Fee Collections
  const { data: feeData } = useQuery({
    queryKey: ['fee-collections-journal'],
    queryFn: async () => {
      const res = await api.get('/income/fee-collections?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch Payrolls
  const { data: payrollData } = useQuery({
    queryKey: ['payrolls-journal'],
    queryFn: async () => {
      const res = await api.get('/payroll/list?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch Master Expense Heads with Codes
  const { data: masterExpenseHeads } = useQuery({
    queryKey: ['master-expense-heads-journal'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  // Fetch Master Income Heads with Codes
  const { data: masterIncomeHeads } = useQuery({
    queryKey: ['master-income-heads-journal'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  // Fetch Master Fee Heads
  const { data: masterFeeHeads } = useQuery({
    queryKey: ['master-fee-heads-journal'],
    queryFn: async () => {
      const res = await api.get('/income/fee-heads');
      return res.data?.data || [];
    },
  });

  // Construct Unified Journal Voucher Records
  const allVouchers: any[] = [];

  // 1. Income Vouchers
  (incomeData || []).forEach((inc: any) => {
    const rName = inc.party?.name || inc.sourceOrg || inc.sourceLevel || 'Government Budget';
    const topicTitle = inc.head ? `${inc.head.code ? `[${inc.head.code}] ` : ''}${inc.head.name}` : 'Government Budget Income';
    allVouchers.push({
      id: `INC-${inc.id}`,
      originalId: inc.id,
      voucherNo: inc.voucherNo || `JV-INC-${new Date().getFullYear()}-${String(inc.id).padStart(4, '0')}`,
      type: 'INCOME',
      typeLabel: 'आम्दानी गोश्वारा भौचर (Income JV)',
      topic: topicTitle,
      recipientName: rName,
      partyId: inc.partyId || inc.party?.id,
      dateBs: inc.receivedDateBs,
      dateAd: inc.receivedDateAd,
      particulars: `${inc.head?.name || 'Income'} (${rName})`,
      debitAccount: inc.depositedInAccount || (inc.paymentMedium === 'CASH' ? 'नगद हिसाब (Cash A/c)' : 'बैंक हिसाब (Bank Current A/c)'),
      creditAccount: `आम्दानी शीर्षक: ${topicTitle}`,
      debitAmount: inc.amount || 0,
      creditAmount: inc.amount || 0,
      paymentMedium: inc.paymentMedium || 'BANK_TRANSFER',
      paymentRef: inc.paymentRef || inc.chequeNo || 'N/A',
      chequeNo: inc.chequeNo,
      preparedBy: inc.receivedBy || 'Accountant',
      remarks: inc.remarks || `Received from ${rName} towards ${inc.head?.name}`,
    });
  });

  // 2. Expense Vouchers
  (expenseData || []).forEach((exp: any) => {
    const rName = exp.party?.name || exp.paidTo || 'Vendor / Supplier';
    const topicTitle = exp.head ? `${exp.head.code ? `[${exp.head.code}] ` : ''}${exp.head.name}` : 'Operating Expense';
    allVouchers.push({
      id: `EXP-${exp.id}`,
      originalId: exp.id,
      voucherNo: exp.voucherNo || `JV-EXP-${new Date().getFullYear()}-${String(exp.id).padStart(4, '0')}`,
      type: 'EXPENSE',
      typeLabel: 'खर्च गोश्वारा भौचर (Expense JV)',
      topic: topicTitle,
      recipientName: rName,
      partyId: exp.partyId || exp.party?.id,
      dateBs: exp.expenseDateBs,
      dateAd: exp.expenseDateAd,
      particulars: `${exp.head?.name || 'Expense'} (Paid to: ${rName})`,
      debitAccount: `खर्च शीर्षक: ${topicTitle}`,
      creditAccount: exp.paidFromAccount || (exp.paymentMedium === 'CASH' ? 'नगद हिसाब (Cash A/c)' : 'बैंक हिसाब (Bank Current A/c)'),
      debitAmount: exp.amount || 0,
      creditAmount: exp.amount || 0,
      paymentMedium: exp.paymentMedium || 'CASH',
      paymentRef: exp.paymentRef || exp.chequeNo || exp.billNo || 'N/A',
      chequeNo: exp.chequeNo,
      preparedBy: exp.approvedBy || 'Accountant',
      remarks: exp.description || exp.remarks || `Expense payment for ${exp.head?.name}`,
    });
  });

  // 3. Student Fee Receipts Vouchers
  (feeData || []).forEach((fee: any) => {
    const rName = fee.student ? `${fee.student.fullName} (${fee.student.studentId})` : 'Student';
    allVouchers.push({
      id: `FEE-${fee.id}`,
      originalId: fee.id,
      voucherNo: fee.receiptNo || `RCP-${new Date().getFullYear()}-${String(fee.id).padStart(4, '0')}`,
      type: 'FEE',
      typeLabel: 'विद्यार्थी शुल्क भौचर (Fee Collection JV)',
      topic: fee.feeHead?.name || 'Student Tuition & Fee',
      recipientName: rName,
      dateBs: fee.paidDateBs,
      dateAd: fee.paidDateAd,
      particulars: `${fee.feeHead?.name || 'Student Fee'} - Student: ${rName}`,
      debitAccount: fee.depositedInAccount || (fee.paymentMedium === 'CASH' ? 'नगद हिसाब (Cash A/c)' : 'बैंक हिसाब (Bank A/c)'),
      creditAccount: `शुल्क शीर्षक: ${fee.feeHead?.name || 'School Fee Head'}`,
      debitAmount: fee.amount || 0,
      creditAmount: fee.amount || 0,
      paymentMedium: fee.paymentMedium || 'CASH',
      paymentRef: fee.paymentRef || 'N/A',
      preparedBy: fee.collectedBy || 'Accountant',
      remarks: fee.remarks || `Fee collection from ${rName}`,
    });
  });

  // 4. Payroll Vouchers
  (payrollData || []).forEach((pay: any) => {
    const rName = pay.teacher ? `${pay.teacher.fullName}` : 'Staff / Teacher';
    allVouchers.push({
      id: `PAY-${pay.id}`,
      originalId: pay.id,
      voucherNo: `JV-PAY-${new Date().getFullYear()}-${String(pay.id).padStart(4, '0')}`,
      type: 'PAYROLL',
      typeLabel: 'शिक्षक तलब गोश्वारा भौचर (Payroll JV)',
      topic: 'Teacher Salary & Allowances (तलब तथा भत्ता)',
      recipientName: rName,
      dateBs: pay.monthFrom || todayBS(),
      dateAd: pay.createdAt,
      particulars: `Teacher Payroll: ${rName} (${pay.monthFrom} to ${pay.monthTo})`,
      debitAccount: 'शिक्षक तलब तथा भत्ता खर्च हिसाब (Teacher Salary Expense A/c)',
      creditAccount: 'बैंक हिसाब / खुद भुक्तानी (Bank Current A/c & Deductions)',
      debitAmount: pay.khudPaaunuParne || pay.jammaTalabBhata || 0,
      creditAmount: pay.khudPaaunuParne || pay.jammaTalabBhata || 0,
      paymentMedium: 'BANK_TRANSFER',
      paymentRef: 'Payroll Disbursement',
      preparedBy: 'School Accountant',
      remarks: `Net Salary disbursement for ${rName}`,
    });
  });

  // Build Comprehensive Master Topics List with Accounting Codes
  const registeredTopicsSet = new Set<string>();

  (masterExpenseHeads || []).forEach((h: any) => {
    registeredTopicsSet.add(`${h.code ? `[${h.code}] ` : ''}${h.name}`);
  });
  (masterIncomeHeads || []).forEach((h: any) => {
    registeredTopicsSet.add(`${h.code ? `[${h.code}] ` : ''}${h.name}`);
  });
  (masterFeeHeads || []).forEach((h: any) => {
    registeredTopicsSet.add(h.name);
  });
  allVouchers.forEach((v) => {
    if (v.topic) registeredTopicsSet.add(v.topic);
  });

  const allTopics = Array.from(registeredTopicsSet).filter(Boolean).sort();

  // Sort & Filter States
  const [sortField, setSortField] = useState<'dateBs' | 'voucherNo' | 'recipientName' | 'topic' | 'amount'>('dateBs');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'dateBs' | 'voucherNo' | 'recipientName' | 'topic' | 'amount') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('ALL');

  const { data: partiesData } = useQuery({
    queryKey: ['parties-journal'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  const filteredVouchers = allVouchers.filter((v) => {
    if (voucherTypeFilter !== 'ALL' && v.type !== voucherTypeFilter) return false;
    if (topicFilter !== 'ALL') {
      const cleanFilter = topicFilter.replace(/^\[.*?\]\s*/, '').toLowerCase();
      const cleanVTopic = (v.topic || '').replace(/^\[.*?\]\s*/, '').toLowerCase();
      if (cleanVTopic !== cleanFilter && v.topic !== topicFilter) return false;
    }
    if (selectedPartyFilter !== 'ALL') {
      const partyObj = partiesData?.find((p: any) => p.id.toString() === selectedPartyFilter);
      if (partyObj) {
        const pName = partyObj.name.toLowerCase();
        const vPart = (v.particulars || '').toLowerCase();
        const vRem = (v.remarks || '').toLowerCase();
        const vRec = (v.recipientName || '').toLowerCase();
        if (!vPart.includes(pName) && !vRem.includes(pName) && !vRec.includes(pName)) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVouch = (v.voucherNo || '').toLowerCase().includes(q);
      const matchTopic = (v.topic || '').toLowerCase().includes(q);
      const matchPart = (v.particulars || '').toLowerCase().includes(q);
      const matchRem = (v.remarks || '').toLowerCase().includes(q);
      const matchRec = (v.recipientName || '').toLowerCase().includes(q);
      const matchCheque = (v.chequeNo || '').toLowerCase().includes(q) || (v.paymentRef || '').toLowerCase().includes(q);
      if (!matchVouch && !matchTopic && !matchPart && !matchRem && !matchRec && !matchCheque) return false;
    }
    return true;
  });

  // Apply dynamic column sorting
  filteredVouchers.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'dateBs') {
      comparison = (a.dateBs || '').localeCompare(b.dateBs || '');
    } else if (sortField === 'voucherNo') {
      comparison = (a.voucherNo || '').localeCompare(b.voucherNo || '');
    } else if (sortField === 'recipientName') {
      comparison = (a.recipientName || '').localeCompare(b.recipientName || '');
    } else if (sortField === 'topic') {
      comparison = (a.topic || '').localeCompare(b.topic || '');
    } else if (sortField === 'amount') {
      comparison = (a.debitAmount || 0) - (b.debitAmount || 0);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Separate Debit vs Credit Entries for Separate Table View
  const debitEntries = filteredVouchers.filter((v) => ['INCOME', 'FEE'].includes(v.type));
  const creditEntries = filteredVouchers.filter((v) => ['EXPENSE', 'PAYROLL'].includes(v.type));

  const totalDebitSum = filteredVouchers.reduce((s, v) => s + v.debitAmount, 0);
  const totalDebitOnly = debitEntries.reduce((s, v) => s + v.debitAmount, 0);
  const totalCreditOnly = creditEntries.reduce((s, v) => s + v.creditAmount, 0);

  // ── EXPORT TO EXCEL / CSV FUNCTION ──────────────────────────────────────────
  const handleExportExcel = () => {
    try {
      const headers = ['Voucher No', 'Date BS', 'Type', 'Particulars', 'Debit Account', 'Credit Account', 'Debit Amount (Rs)', 'Credit Amount (Rs)', 'Payment Mode', 'Remarks'];
      const rows = filteredVouchers.map((v) => [
        `"${v.voucherNo}"`,
        `"${v.dateBs}"`,
        `"${v.type}"`,
        `"${v.particulars.replace(/"/g, '""')}"`,
        `"${v.debitAccount.replace(/"/g, '""')}"`,
        `"${v.creditAccount.replace(/"/g, '""')}"`,
        v.debitAmount,
        v.creditAmount,
        `"${v.paymentMedium}"`,
        `"${(v.remarks || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Nepal_School_ERP_Journal_Ledger_${todayBS()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Journal Ledger exported to Excel / CSV file successfully!');
    } catch (err) {
      toast.error('Failed to export ledger to Excel.');
    }
  };

  const triggerJournalLedgerPrint = () => {
    if (!filteredVouchers || filteredVouchers.length === 0) {
      toast.error('No journal entries to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const totalDrSum = filteredVouchers.reduce((s, v) => s + (v.debitAmount || 0), 0);
    const totalCrSum = filteredVouchers.reduce((s, v) => s + (v.creditAmount || 0), 0);

    const rowsHtml = filteredVouchers
      .map((v: any) => `
        <tr>
          <td rowspan="3" style="text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; vertical-align: top; padding: 6px;">${v.dateBs}</td>
          <td rowspan="3" style="text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; vertical-align: top; padding: 6px; color: #1e3a5f;">${v.voucherNo}</td>
          <td rowspan="3" style="border: 1px solid #cbd5e1; font-weight: bold; vertical-align: top; padding: 6px; font-size: 9.5px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 10px;">${v.topic}</div>
            ${v.recipientName ? `<div style="font-size: 9px; font-weight: 800; color: #4338ca; margin-top: 4px; background: #eef2ff; padding: 2px 6px; border-radius: 4px; display: inline-block; border: 1px solid #c7d2fe;">👤 <strong>Party:</strong> ${v.recipientName}</div>` : ''}
            ${v.chequeNo ? `<div style="font-size: 8.5px; font-weight: 800; color: #7e22ce; margin-top: 3px; background: #faf5ff; padding: 2px 6px; border-radius: 4px; display: inline-block; border: 1px solid #e9d5ff;">🔖 <strong>Cheque No:</strong> ${v.chequeNo}</div>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: bold;">
            <span style="color: #15803d; font-weight: 900; margin-right: 4px;">Dr.</span> ${v.debitAccount}
          </td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #15803d; padding: 5px 6px;">रू ${(v.debitAmount || 0).toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace; color: #94a3b8; padding: 5px 6px;">—</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: bold; padding-left: 20px;">
            <span style="color: #b91c1c; font-weight: 900; margin-right: 4px;">Cr.</span> ${v.creditAccount}
          </td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace; color: #94a3b8; padding: 5px 6px;">—</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #b91c1c; padding: 5px 6px;">रू ${(v.creditAmount || 0).toLocaleString()}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9.5px; color: #334155;">
            <div style="margin-bottom: 3px;"><em>(Narration: ${v.remarks || v.particulars})</em></div>
            <div style="font-size: 9px; font-weight: 700; color: #1e3a5f; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
              ${v.recipientName ? `<span style="color: #4338ca;">👤 <strong>Party / Recipient (पाउने पक्ष):</strong> <span style="background: #eef2ff; padding: 1px 6px; border-radius: 3px; border: 1px solid #c7d2fe;">${v.recipientName}</span></span>` : ''}
              <span>💳 <strong>Payment Mode:</strong> <span style="text-transform: uppercase;">${v.paymentMedium || 'CASH'}</span></span>
              ${v.chequeNo ? `<span style="color: #7e22ce; background: #faf5ff; padding: 1px 6px; border-radius: 3px; border: 1px solid #e9d5ff;">🔖 <strong>Cheque No (चेक नं.):</strong> ${v.chequeNo}</span>` : ''}
              ${v.paymentRef && v.paymentRef !== 'N/A' && v.paymentRef !== v.chequeNo ? `<span>Ref: ${v.paymentRef}</span>` : ''}
            </div>
          </td>
        </tr>
      `)
      .join('');

    const schoolName = school?.name || 'Shree Nepal Secondary School';
    const schoolNameNepali = school?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट';
    const schoolAddress = school?.address || 'Bishrampur, Rautahat';
    const emisCode = school?.emisCode || '320160005';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Journal Ledger Book - ${schoolName}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 5px 4px; }
            .footer-sig { margin-top: 35px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 160px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolNameNepali}</div>
            <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${schoolName} • ${schoolAddress} (IEMIS: ${emisCode})</div>
            <div class="badge">COMPLETE JOURNAL LEDGER BOOK (गोश्वारा भौचर तथा खाता पुस्तक)</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 85px; text-align: center;">DATE (BS)</th>
                <th style="width: 105px; text-align: center;">VOUCHER NO</th>
                <th style="width: 140px;">TOPIC / HEAD</th>
                <th>PARTICULARS & BREAKDOWN (विस्तृत विवरण)</th>
                <th style="width: 110px; text-align: right;">DEBIT (Dr. रू)</th>
                <th style="width: 110px; text-align: right;">CREDIT (Cr. रू)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #1e3a5f; color: #fff; font-weight: bold; font-size: 10.5px;">
                <td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #1e3a5f; text-transform: uppercase;">
                  Total Balancing Summary (कुल सन्तुलित खाता विवरण):
                </td>
                <td style="text-align: right; padding: 8px; border: 1px solid #1e3a5f; font-family: monospace; color: #86efac;">
                  Dr. रू ${totalDrSum.toLocaleString()}
                </td>
                <td style="text-align: right; padding: 8px; border: 1px solid #1e3a5f; font-family: monospace; color: #fca5a5;">
                  Cr. रू ${totalCrSum.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-sig">
            <div class="sig-box">Prepared By (लेखापाल)</div>
            <div class="sig-box">Internal Auditor (जाँच गर्ने)</div>
            <div class="sig-box">Approved By (प्रधानाध्यापक)</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const triggerJournalVoucherPrint = () => {
    if (!selectedVoucher) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const v = selectedVoucher;
    const schoolName = school?.name || 'Shree Nepal Secondary School';
    const schoolNameNepali = school?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट';
    const schoolAddress = school?.address || 'Bishrampur, Rautahat';
    const emisCode = school?.emisCode || '320160005';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Journal Voucher - ${v.voucherNo || 'Voucher'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 20px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 17px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 6px 4px; border: 1px solid #cbd5e1; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 150px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${schoolNameNepali}</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${schoolName} • ${schoolAddress} (IEMIS: ${emisCode})</div>
              <div class="badge">NEPAL GOVT FORMAT JOURNAL VOUCHER (गोश्वारा भौचर)</div>
            </div>

            <div class="meta-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              <div>Voucher No: <strong style="color: #1e3a5f;">${v.voucherNo || 'VOUCH-001'}</strong></div>
              <div>Date: <strong>${v.dateBs || todayBS()} BS</strong></div>
              <div>Party / Recipient: <strong style="color: #1e3a5f;">${v.recipientName || 'N/A'}</strong></div>
              <div>Payment Mode: <strong style="text-transform: uppercase;">${v.paymentMedium || 'CASH'}</strong></div>
              <div>Cheque / Ref No: <strong style="color: #b91c1c;">${v.chequeNo || v.paymentRef || 'N/A'}</strong></div>
              <div>Accounting Topic: <strong>${v.topic || 'General'}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">S.N.</th>
                  <th>ACCOUNT HEAD & PARTICULARS</th>
                  <th style="width: 120px; text-align: right;">DEBIT (Dr. रू)</th>
                  <th style="width: 120px; text-align: right;">CREDIT (Cr. रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>
                    <strong style="color: #15803d;">Dr. ${v.debitAccount}</strong>
                    <div style="font-size: 9.5px; color: #555; margin-top: 2px;">${v.particulars} (${v.topic})</div>
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #15803d;">रू ${(v.debitAmount || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; color: #94a3b8;">—</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td>
                    <strong style="color: #b91c1c; padding-left: 12px;">Cr. ${v.creditAccount}</strong>
                  </td>
                  <td style="text-align: right; font-family: monospace; color: #94a3b8;">—</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">रू ${(v.creditAmount || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-bottom: 20px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <strong>Narration / Remarks:</strong> ${v.remarks || v.particulars || 'N/A'}
            </div>

            <div class="footer-sig">
              <div class="sig-box">Prepared By (लेखापाल)</div>
              <div class="sig-box">Checked By</div>
              <div class="sig-box">Approved By (प्रधानाध्यापक)</div>
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

  // Selected Party Object & Vouchers for Party-Wise View Mode
  const selectedPartyObj = partiesData?.find((p: any) => p.id.toString() === partyWiseSelectedId);

  const partyVouchersList = allVouchers.filter((v) => {
    if (partyWiseSelectedId === 'ALL') return true;
    if (v.partyId?.toString() === partyWiseSelectedId) return true;
    if (selectedPartyObj && v.recipientName?.toLowerCase().includes(selectedPartyObj.name.toLowerCase())) return true;
    return false;
  });

  const partyDebitsSum = partyVouchersList
    .filter((v) => v.type === 'EXPENSE' || v.type === 'PAYROLL')
    .reduce((acc, curr) => acc + (curr.debitAmount || 0), 0);

  const partyCreditsSum = partyVouchersList
    .filter((v) => v.type === 'INCOME' || v.type === 'FEE')
    .reduce((acc, curr) => acc + (curr.creditAmount || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Journal Vouchers & Ledger Register (गोश्वारा भौचर तथा खाता रजिस्टर)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकार दोहोरो लेखा प्रणाली बमोजिम डेबिट तथा क्रेडिट अलग-अलग खाता, भौचर र प्रतिवेदन
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs"
          >
            <FileSpreadsheet size={15} />
            <span>Export to Excel (एक्सेल)</span>
          </button>

          <button
            onClick={() => setIsPrintLedgerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a5280] px-4 py-2 text-xs font-bold transition shadow-2xs"
          >
            <Printer size={15} />
            <span>Print Journal Ledger (खाता प्रिन्ट)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Total Debit Entries (प्राप्ति/आम्दानी)</span>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#1e3a5f] mt-2 font-mono">रू {totalDebitOnly.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">{debitEntries.length} Debit Transactions</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total Credit Entries (भुक्तानी/खर्च)</span>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-700">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2 font-mono">रू {totalCreditOnly.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">{creditEntries.length} Credit Transactions</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Net Balanced Journal Fund</span>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            रू {(totalDebitOnly - totalCreditOnly).toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Balanced Double-Entry Net Ledger</p>
        </div>
      </div>

      {/* Filter Bar & View Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setViewMode('SEPARATE')}
            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'SEPARATE' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={13} />
            <span>Separate Debit / Credit Tables</span>
          </button>
          <button
            onClick={() => setViewMode('COMBINED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'COMBINED' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={13} />
            <span>Combined Journal Register</span>
          </button>
          <button
            onClick={() => setViewMode('PARTY_WISE')}
            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'PARTY_WISE' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building size={13} />
            <span>Party-Wise Journal Ledger (पाउने पक्ष लेजर)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Topic / Head Filter Dropdown */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="erp-input text-xs font-extrabold text-[#1e3a5f] bg-purple-50 border-purple-200"
          >
            <option value="ALL">-- All Topics (सबै शीर्षकहरू) --</option>
            {allTopics.map((top) => (
              <option key={top} value={top}>
                {top}
              </option>
            ))}
          </select>

          {/* Voucher Type Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Types' },
              { id: 'INCOME', label: 'Income' },
              { id: 'EXPENSE', label: 'Expense' },
              { id: 'FEE', label: 'Fee' },
              { id: 'PAYROLL', label: 'Payroll' },
            ].map((flt) => (
              <button
                key={flt.id}
                onClick={() => setVoucherTypeFilter(flt.id as any)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  voucherTypeFilter === flt.id ? 'bg-[#1e3a5f] text-white' : 'bg-slate-50 text-gray-600 hover:bg-slate-100'
                }`}
              >
                {flt.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search voucher, head..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="erp-input pl-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: SEPARATE DEBIT AND CREDIT TABLES ───────────────────────── */}
      {viewMode === 'SEPARATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. DEBIT ENTRIES TABLE */}
          <div className="rounded-2xl border border-blue-200 bg-white shadow-2xs overflow-hidden space-y-0">
            <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <ArrowDownLeft size={16} className="text-emerald-400" />
                <span>Debit Entries Table (डेबिट खाता - आम्दानी तथा प्राप्ति)</span>
              </h2>
              <span className="text-xs font-mono font-bold bg-blue-900/60 px-2.5 py-0.5 rounded text-blue-200">
                Rs. {totalDebitOnly.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Date (BS)</th>
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Particulars / Head</th>
                    <th className="p-3">Debit Account</th>
                    <th className="p-3 text-right">Debit (रू)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {debitEntries.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">No debit entries recorded.</td></tr>
                  ) : (
                    debitEntries.map((v) => (
                      <tr key={v.id} className="hover:bg-blue-50/50">
                        <td className="p-3 font-mono font-bold text-gray-800">{v.dateBs}</td>
                        <td className="p-3 font-mono font-bold text-[#1e3a5f]">{v.voucherNo}</td>
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">{v.particulars}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-[#1e3a5f] font-mono font-extrabold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {v.topic}
                            </span>
                            {v.recipientName && (
                              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                👤 {v.recipientName}
                              </span>
                            )}
                            {v.chequeNo && (
                              <span className="text-[9.5px] font-mono font-extrabold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                🔖 {v.chequeNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">{v.debitAccount}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          Rs. {v.debitAmount?.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedVoucher(v)}
                            className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-0.5 text-[10px] font-extrabold"
                          >
                            <Printer size={10} />
                            <span>Voucher</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. CREDIT ENTRIES TABLE */}
          <div className="rounded-2xl border border-rose-200 bg-white shadow-2xs overflow-hidden space-y-0">
            <div className="bg-rose-900 px-4 py-3 text-white flex items-center justify-between">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <ArrowUpRight size={16} className="text-rose-300" />
                <span>Credit Entries Table (क्रेडिट खाता - खर्च तथा भुक्तानी)</span>
              </h2>
              <span className="text-xs font-mono font-bold bg-rose-950 px-2.5 py-0.5 rounded text-rose-200">
                Rs. {totalCreditOnly.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Date (BS)</th>
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Particulars / Head</th>
                    <th className="p-3">Credit Account</th>
                    <th className="p-3 text-right">Credit (रू)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {creditEntries.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">No credit entries recorded.</td></tr>
                  ) : (
                    creditEntries.map((v) => (
                      <tr key={v.id} className="hover:bg-rose-50/50">
                        <td className="p-3 font-mono font-bold text-gray-800">{v.dateBs}</td>
                        <td className="p-3 font-mono font-bold text-rose-900">{v.voucherNo}</td>
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">{v.particulars}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-[#1e3a5f] font-mono font-extrabold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              {v.topic}
                            </span>
                            {v.recipientName && (
                              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                👤 {v.recipientName}
                              </span>
                            )}
                            {v.chequeNo && (
                              <span className="text-[9.5px] font-mono font-extrabold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                🔖 {v.chequeNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-600">{v.creditAccount}</td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          Rs. {v.creditAmount?.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedVoucher(v)}
                            className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-0.5 text-[10px] font-extrabold"
                          >
                            <Printer size={10} />
                            <span>Voucher</span>
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

      {/* ─── VIEW 2: COMBINED DOUBLE-ENTRY JOURNAL REGISTER TABLE ───────────── */}
      {viewMode === 'COMBINED' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-[#1e3a5f] text-white font-bold">
                <tr>
                  <th onClick={() => handleSort('dateBs')} className="p-3 cursor-pointer select-none hover:bg-[#2a5280] transition">
                    <div className="flex items-center gap-1">
                      <span>Date (BS)</span>
                      {sortField === 'dateBs' && <span className="text-amber-300 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th onClick={() => handleSort('voucherNo')} className="p-3 cursor-pointer select-none hover:bg-[#2a5280] transition">
                    <div className="flex items-center gap-1">
                      <span>Voucher No</span>
                      {sortField === 'voucherNo' && <span className="text-amber-300 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th onClick={() => handleSort('topic')} className="p-3 cursor-pointer select-none hover:bg-[#2a5280] transition">
                    <div className="flex items-center gap-1">
                      <span>Topic / Head (शीर्षक)</span>
                      {sortField === 'topic' && <span className="text-amber-300 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th onClick={() => handleSort('recipientName')} className="p-3 cursor-pointer select-none hover:bg-[#2a5280] transition">
                    <div className="flex items-center gap-1">
                      <span>Particulars & Party / Cheque (विस्तृत विवरण)</span>
                      {sortField === 'recipientName' && <span className="text-amber-300 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th onClick={() => handleSort('amount')} className="p-3 text-right cursor-pointer select-none hover:bg-[#2a5280] transition">
                    <div className="flex items-center justify-end gap-1">
                      <span>Debit (Dr. रू)</span>
                      {sortField === 'amount' && <span className="text-amber-300 font-bold">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th className="p-3 text-right">Credit (Cr. रू)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">No journal entries found for selected filter.</td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <Fragment key={v.id}>
                      {/* Row 1: Debit Line */}
                      <tr className="hover:bg-blue-50/40">
                        <td rowSpan={3} className="p-3 font-mono font-bold text-gray-800 align-top border-r border-gray-100">
                          {v.dateBs}
                        </td>
                        <td rowSpan={3} className="p-3 font-mono font-extrabold text-[#1e3a5f] align-top border-r border-gray-100">
                          {v.voucherNo}
                        </td>
                        <td rowSpan={3} className="p-3 align-top border-r border-gray-100">
                          <span className="inline-block rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-black font-nepali border border-purple-200">
                            {v.topic}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-1 font-bold">{v.type}</span>
                          {v.recipientName && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              <span>👤 {v.recipientName}</span>
                            </div>
                          )}
                          {v.chequeNo && (
                            <div className="mt-1 flex items-center gap-1 text-[9.5px] font-mono font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              <span>🔖 Cheque: {v.chequeNo}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-gray-900">
                          <span className="text-emerald-700 font-extrabold mr-1">Dr.</span>
                          <span>{v.debitAccount}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-emerald-700">
                          Rs. {v.debitAmount?.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-300">—</td>
                        <td rowSpan={3} className="p-3 text-center align-middle border-l border-gray-100">
                          <button
                            onClick={() => setSelectedVoucher(v)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 py-1 text-xs font-extrabold shadow-2xs transition"
                          >
                            <Printer size={12} />
                            <span>Print JV</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 2: Credit Line (Indented) */}
                      <tr className="hover:bg-rose-50/40">
                        <td className="p-2.5 font-bold text-gray-800 pl-8">
                          <span className="text-rose-700 font-extrabold mr-1">Cr.</span>
                          <span>{v.creditAccount}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-300">—</td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-rose-700">
                          Rs. {v.creditAmount?.toLocaleString()}
                        </td>
                      </tr>

                      {/* Row 3: Narration & Cheque Details Line */}
                      <tr className="bg-slate-50/70 text-[11px] text-gray-600 border-b border-gray-200">
                        <td colSpan={3} className="p-2.5 pl-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span><strong>Narration:</strong> {v.remarks || v.particulars}</span>
                            <span><strong>Payment Mode:</strong> <span className="font-semibold uppercase">{v.paymentMedium || 'CASH'}</span></span>
                            {v.recipientName && (
                              <span><strong>Party / Recipient:</strong> <span className="text-[#1e3a5f] font-bold">{v.recipientName}</span></span>
                            )}
                            {(v.chequeNo || v.paymentRef) && (
                              <span><strong>Cheque / Ref No:</strong> <span className="font-mono font-extrabold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{v.chequeNo || v.paymentRef}</span></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#1e3a5f] text-white font-extrabold text-xs">
                <tr>
                  <td colSpan={4} className="p-3 text-right">
                    <span className="uppercase tracking-wider">Total Balancing Summary (कुल सन्तुलन विवरण):</span>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300">
                    Dr. Rs. {filteredVouchers.reduce((acc, curr) => acc + (curr.debitAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-300">
                    Cr. Rs. {filteredVouchers.reduce((acc, curr) => acc + (curr.creditAmount || 0), 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-black border border-emerald-400/40">
                      <CheckCircle2 size={12} />
                      <span>Balanced ✓</span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── VIEW 3: PARTY-WISE JOURNAL LEDGER REGISTER ───────────────────── */}
      {viewMode === 'PARTY_WISE' && (
        <div className="space-y-6">
          {/* Party Selector Header & Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Building size={18} className="text-rose-600" />
                  <span>Party-Wise Journal Ledger (पाउने व्यक्ति/संस्था अनुसार भौचर लेजर)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali mt-0.5">
                  विशिष्ट vendor, सप्लायर वा सरकारी निकाय अनुसार दोहोरो लेखा प्रणाली गोश्वारा भौचर सूची
                </p>
              </div>

              {/* Party Selector Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Select Party / Vendor:</label>
                <select
                  value={partyWiseSelectedId}
                  onChange={(e) => setPartyWiseSelectedId(e.target.value)}
                  className="erp-input font-bold text-xs text-[#1e3a5f] border-rose-300 min-w-[240px]"
                >
                  <option value="ALL">-- All Parties Ledger (सबै पाउने पक्षहरू) --</option>
                  {partiesData?.map((p: any) => (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''} [{p.vouchersCount || 0} Vouchers]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Top Summary Cards for Selected Party */}
            {selectedPartyObj && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Party Name & Type</span>
                  <p className="text-sm font-extrabold text-[#1e3a5f] mt-0.5">{selectedPartyObj.name}</p>
                  <span className="text-[10px] font-bold text-rose-700">PAN: {selectedPartyObj.panNo || 'N/A'} • {selectedPartyObj.partyType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Debit Vouchers (खर्च / भुक्तानी)</span>
                  <p className="text-base font-extrabold text-rose-700 font-mono mt-0.5">
                    रू {partyDebitsSum.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Credit Vouchers (आम्दानी / प्राप्ति)</span>
                  <p className="text-base font-extrabold text-emerald-700 font-mono mt-0.5">
                    रू {partyCreditsSum.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Net Party Ledger Balance</span>
                  <p className="text-base font-extrabold text-[#1e3a5f] font-mono mt-0.5">
                    रू {(partyDebitsSum - partyCreditsSum).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Party Vouchers Journal Register Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="bg-[#1e3a5f] px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-amber-400" />
                <span>
                  {selectedPartyObj ? `Party Journal Ledger: ${selectedPartyObj.name}` : 'All Party Journal Vouchers'}
                </span>
              </h3>
              <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-0.5 rounded text-amber-300">
                {partyVouchersList.length} Vouchers Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 text-gray-700 text-[10.5px] uppercase font-extrabold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Date (BS)</th>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Particulars & Accounting Code</th>
                    <th className="py-3 px-4">Party / Recipient</th>
                    <th className="py-3 px-4 text-right">Debit (Dr. रू)</th>
                    <th className="py-3 px-4 text-right">Credit (Cr. रू)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {partyVouchersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-nepali">
                        छानिएको पाउने पक्षका लागि कुनै गोश्वारा भौचर प्रविष्टि भेटिएन।
                      </td>
                    </tr>
                  ) : (
                    partyVouchersList.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {v.dateBs}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#1e3a5f] whitespace-nowrap">
                          {v.voucherNo}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{v.particulars}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-[#1e3a5f] font-mono font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block">
                              {v.topic}
                            </span>
                            {v.chequeNo && (
                              <span className="text-[9.5px] font-mono font-extrabold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block">
                                🔖 Cheque: {v.chequeNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-700">
                          {v.recipientName || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-700 whitespace-nowrap">
                          {v.type === 'EXPENSE' || v.type === 'PAYROLL' ? `रू ${(v.debitAmount || 0).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                          {v.type === 'INCOME' || v.type === 'FEE' ? `रू ${(v.creditAmount || 0).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedVoucher(v)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 py-1 text-xs font-extrabold shadow-2xs transition"
                          >
                            <Printer size={12} />
                            <span>Print JV</span>
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

      {/* ─── PRINTABLE FULL JOURNAL LEDGER REGISTER MODAL ────────────────────── */}
      {isPrintLedgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <span className="font-extrabold text-[#1e3a5f] text-sm flex items-center gap-2">
                <Printer size={16} />
                <span>Print Complete Journal Ledger Book (गोश्वारा भौचर तथा खाता पुस्तक)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerJournalLedgerPrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2a5280]"
                >
                  <Printer size={14} />
                  <span>Print Ledger Book (प्रिन्ट)</span>
                </button>
                <button onClick={() => setIsPrintLedgerOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="printable-document border-2 border-[#1e3a5f] p-6 rounded-2xl bg-white space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl border border-gray-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                    ) : (
                      <SchoolIcon className="h-10 w-10 text-[#1e3a5f]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#1e3a5f] tracking-wide uppercase">
                      {school.name || 'Nepal Model Secondary School'}
                    </h2>
                    <h3 className="text-xs font-bold text-gray-800 font-nepali">
                      {school.nameNepali || 'नेपाल आदर्श माध्यमिक विद्यालय'}
                    </h3>
                    <p className="text-[10px] text-gray-600">
                      {school.address || 'Kathmandu, Nepal'} • IEMIS: <b className="font-mono">{school.emisCode || 'ABC123'}</b>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block bg-[#1e3a5f] text-white font-extrabold px-3.5 py-1 rounded text-xs tracking-wider uppercase">
                    GENERAL JOURNAL LEDGER BOOK
                  </span>
                  <p className="font-mono text-[11px] text-gray-600">Year: {activeYear?.year || '2081-82'} • Date: {todayBS()}</p>
                </div>
              </div>

              {/* Single Unified Double-Entry Journal Register Table */}
              <div className="space-y-1">
                <h4 className="font-bold text-[#1e3a5f] uppercase text-[11px] mb-2">
                  General Double-Entry Journal Ledger (दोहोरो लेखा प्रणाली भौचर तथा खाता सूची)
                </h4>
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white font-bold">
                      <th className="border border-gray-400 p-2 w-24">Date (BS)</th>
                      <th className="border border-gray-400 p-2 w-28">Voucher No</th>
                      <th className="border border-gray-400 p-2 text-left w-36">Topic / Head</th>
                      <th className="border border-gray-400 p-2 text-left">Particulars & Breakdown (विस्तृत विवरण)</th>
                      <th className="border border-gray-400 p-2 w-28 text-right">Debit (Dr. Rs.)</th>
                      <th className="border border-gray-400 p-2 w-28 text-right">Credit (Cr. Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border border-gray-400 p-6 text-center text-gray-400">
                          No journal entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((v) => (
                        <Fragment key={v.id}>
                          {/* Row 1: Debit Line */}
                          <tr>
                            <td rowSpan={3} className="border border-gray-400 p-2 font-mono text-center font-bold align-top">
                              {v.dateBs}
                            </td>
                            <td rowSpan={3} className="border border-gray-400 p-2 font-mono font-bold align-top text-[#1e3a5f]">
                              {v.voucherNo}
                            </td>
                            <td rowSpan={3} className="border border-gray-400 p-2 align-top font-bold text-gray-800">
                              <div className="font-extrabold text-gray-900">{v.topic}</div>
                              {v.recipientName && (
                                <div className="mt-1 text-[10px] font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                                  👤 {v.recipientName}
                                </div>
                              )}
                              {v.chequeNo && (
                                <div className="mt-1 text-[9.5px] font-mono font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block">
                                  🔖 Cheque: {v.chequeNo}
                                </div>
                              )}
                            </td>
                            <td className="border-t border-l border-r border-gray-300 p-2 font-bold text-gray-900">
                              <span className="text-emerald-700 font-extrabold mr-1">Dr.</span>
                              <span>{v.debitAccount}</span>
                            </td>
                            <td className="border-t border-l border-r border-gray-300 p-2 text-right font-mono font-bold text-emerald-800">
                              Rs. {v.debitAmount?.toLocaleString()}
                            </td>
                            <td className="border-t border-l border-r border-gray-300 p-2 text-right font-mono text-gray-400">—</td>
                          </tr>

                          {/* Row 2: Credit Line (Indented) */}
                          <tr>
                            <td className="border-l border-r border-gray-300 p-2 font-bold text-gray-800 pl-6">
                              <span className="text-rose-700 font-extrabold mr-1">Cr.</span>
                              <span>{v.creditAccount}</span>
                            </td>
                            <td className="border-l border-r border-gray-300 p-2 text-right font-mono text-gray-400">—</td>
                            <td className="border-l border-r border-gray-300 p-2 text-right font-mono font-bold text-rose-800">
                              Rs. {v.creditAmount?.toLocaleString()}
                            </td>
                          </tr>

                          {/* Row 3: Narration Line */}
                          <tr className="bg-slate-50 text-[10px] text-gray-700 border-b border-gray-400">
                            <td colSpan={3} className="p-2 pl-3 border-l border-r border-b border-gray-400">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span className="italic">Narration: {v.remarks || v.particulars}</span>
                                <span><strong>Payment Mode:</strong> <span className="uppercase font-bold">{v.paymentMedium || 'CASH'}</span></span>
                                {v.recipientName && (
                                  <span><strong>Party / Recipient:</strong> <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">{v.recipientName}</span></span>
                                )}
                                {v.chequeNo && (
                                  <span><strong>Cheque No:</strong> <span className="font-mono font-extrabold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{v.chequeNo}</span></span>
                                )}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1e3a5f] text-white font-extrabold text-xs">
                      <td colSpan={4} className="border border-gray-400 p-2.5 text-right uppercase tracking-wider">
                        Total Balancing Ledger Summary (सन्तुलित खाता भुक्तानी विवरण):
                      </td>
                      <td className="border border-gray-400 p-2.5 text-right font-mono text-emerald-300">
                        Dr. Rs. {filteredVouchers.reduce((acc, curr) => acc + (curr.debitAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-400 p-2.5 text-right font-mono text-rose-300">
                        Cr. Rs. {filteredVouchers.reduce((acc, curr) => acc + (curr.creditAmount || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures & School Seal Footer */}
              <div className="pt-10 flex items-end justify-between text-center">
                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">तयार गर्ने (Accountant)</span>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">जाँच गर्ने (Internal Auditor)</span>
                </div>

                <div className="h-20 w-20 flex items-center justify-center relative">
                  {school.sealUrl ? (
                    <img src={school.sealUrl} alt="Official Seal" className="h-full w-full object-contain opacity-90 rotate-[-5deg]" />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center text-[10px] font-bold text-red-500 rotate-[-12deg]">
                      OFFICIAL SEAL
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">स्वीकृत गर्ने (Headmaster)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE DOUBLE-ENTRY JOURNAL VOUCHER MODAL (INDIVIDUAL JV) ───── */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <span className="font-extrabold text-[#1e3a5f] text-sm flex items-center gap-2">
                <FileText size={16} />
                <span>Nepal Government Format Journal Voucher (गोश्वारा भौचर)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerJournalVoucherPrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2a5280]"
                >
                  <Printer size={14} />
                  <span>Print Voucher (प्रिन्ट)</span>
                </button>
                <button onClick={() => setSelectedVoucher(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="printable-document border-2 border-[#1e3a5f] p-6 rounded-2xl bg-white space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl border border-gray-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                    ) : (
                      <SchoolIcon className="h-10 w-10 text-[#1e3a5f]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#1e3a5f] tracking-wide uppercase">
                      {school.name || 'Nepal Model Secondary School'}
                    </h2>
                    <h3 className="text-xs font-bold text-gray-800 font-nepali">
                      {school.nameNepali || 'नेपाल आदर्श माध्यमिक विद्यालय'}
                    </h3>
                    <p className="text-[10px] text-gray-600">
                      {school.address || 'Kathmandu, Nepal'} • IEMIS Code: <b className="font-mono">{school.emisCode || 'ABC123'}</b>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block bg-[#1e3a5f] text-white font-extrabold px-3.5 py-1 rounded text-xs tracking-wider uppercase">
                    GOVERNMENT JOURNAL VOUCHER
                  </span>
                  <h4 className="font-nepali font-extrabold text-xs text-[#1e3a5f] mt-0.5">गोश्वारा भौचर (म.ले.प. फारम नं. २०३)</h4>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-gray-500 font-sans font-bold block text-[9px] uppercase">Voucher No (भौचर नं.):</span>
                  <strong className="text-[#1e3a5f] text-xs font-black">{selectedVoucher.voucherNo}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-sans font-bold block text-[9px] uppercase">Date BS (मिति):</span>
                  <strong className="text-gray-900">{selectedVoucher.dateBs}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-sans font-bold block text-[9px] uppercase">Academic Year:</span>
                  <strong className="text-gray-900">{activeYear?.year || '2081-82'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-sans font-bold block text-[9px] uppercase">Payment Medium:</span>
                  <strong className="text-purple-800 uppercase">{selectedVoucher.paymentMedium}</strong>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-xs">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white font-bold text-center">
                    <th className="border border-gray-400 p-2 w-16">संकेत नं.<br />(Code)</th>
                    <th className="border border-gray-400 p-2 text-left">व्यहोरा तथा हिसाब शीर्षक (Particulars & Accounts)</th>
                    <th className="border border-gray-400 p-2 w-16">खाता पाना<br />(L.F.)</th>
                    <th className="border border-gray-400 p-2 w-28 text-right">डेबिट रकम (Dr. Rs.)</th>
                    <th className="border border-gray-400 p-2 w-28 text-right">क्रेडिट रकम (Cr. Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-400 p-2.5 text-center font-mono font-bold">101</td>
                    <td className="border border-gray-400 p-2.5 font-bold text-gray-900">
                      डेबिट: {selectedVoucher.debitAccount}
                    </td>
                    <td className="border border-gray-400 p-2.5 text-center font-mono">15</td>
                    <td className="border border-gray-400 p-2.5 text-right font-mono font-bold text-emerald-800">
                      Rs. {selectedVoucher.debitAmount?.toLocaleString()}
                    </td>
                    <td className="border border-gray-400 p-2.5 text-right font-mono text-gray-400">—</td>
                  </tr>

                  <tr>
                    <td className="border border-gray-400 p-2.5 text-center font-mono font-bold">201</td>
                    <td className="border border-gray-400 p-2.5 font-bold text-gray-900 pl-6">
                      क्रेडिट: {selectedVoucher.creditAccount}
                    </td>
                    <td className="border border-gray-400 p-2.5 text-center font-mono">24</td>
                    <td className="border border-gray-400 p-2.5 text-right font-mono text-gray-400">—</td>
                    <td className="border border-gray-400 p-2.5 text-right font-mono font-bold text-emerald-800">
                      Rs. {selectedVoucher.creditAmount?.toLocaleString()}
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={3} className="border border-gray-400 p-2 text-right uppercase">
                      कुल जम्मा (Total Balanced Amount):
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono text-sm text-[#1e3a5f]">
                      Rs. {selectedVoucher.debitAmount?.toLocaleString()}
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono text-sm text-[#1e3a5f]">
                      Rs. {selectedVoucher.creditAmount?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-gray-700 block mb-0.5">व्यहोरा संक्षिप्त विवरण (Narration):</span>
                <p className="text-gray-800 italic">
                  "{selectedVoucher.remarks || `Journal entry posted for ${selectedVoucher.particulars}`}"
                </p>
              </div>

              <div className="pt-10 flex items-end justify-between text-center">
                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">भौचर तयार गर्ने<br />(Prepared By)</span>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">जाँच गर्ने<br />(Checked By)</span>
                </div>

                <div className="h-20 w-20 flex items-center justify-center relative">
                  {school.sealUrl ? (
                    <img src={school.sealUrl} alt="Official Seal" className="h-full w-full object-contain opacity-90 rotate-[-5deg]" />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center text-[10px] font-bold text-red-500 rotate-[-12deg]">
                      OFFICIAL SEAL
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">स्वीकृत गर्ने (प्रधानाध्यापक)<br />(Headmaster / Approved)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
