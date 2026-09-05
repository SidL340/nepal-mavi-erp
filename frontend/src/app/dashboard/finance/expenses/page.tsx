'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, formatDateInput } from '@/lib/nepali-date';
import {
  TrendingDown,
  Plus,
  Filter,
  Receipt,
  FileText,
  X,
  CreditCard,
  Building,
  UserCheck,
  Search,
  Users,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
  Printer,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ACTIVE');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [inspectPartyId, setInspectPartyId] = useState<number | null>(null);

  // Form State
  const [expenseFormYearId, setExpenseFormYearId] = useState<string>('');
  const [newHeadCode, setNewHeadCode] = useState('');
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadNameNepali, setNewHeadNameNepali] = useState('');

  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyNameNepali, setNewPartyNameNepali] = useState('');
  const [newPartyType, setNewPartyType] = useState('VENDOR');
  const [customPartyType, setCustomPartyType] = useState('');
  const [newPartyPan, setNewPartyPan] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  const [paymentMedium, setPaymentMedium] = useState('CASH');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedBankAcc, setSelectedBankAcc] = useState('');
  const [approvedByOption, setApprovedByOption] = useState('Principal (प्रधानाध्यापक)');
  const [customApprovedBy, setCustomApprovedBy] = useState('');

  // Date States with Auto Formatting
  const [addExpenseDateBs, setAddExpenseDateBs] = useState(todayBS());
  const [addChequeDateBs, setAddChequeDateBs] = useState(todayBS());

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editAcademicYearId, setEditAcademicYearId] = useState('');
  const [editHeadId, setEditHeadId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editExpenseDateBs, setEditExpenseDateBs] = useState('');
  const [editPartyId, setEditPartyId] = useState('');
  const [editPaidTo, setEditPaidTo] = useState('');
  const [editPaymentMedium, setEditPaymentMedium] = useState('CASH');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editPaidFromAccount, setEditPaidFromAccount] = useState('');
  const [editChequeNo, setEditChequeNo] = useState('');
  const [editChequePayeeName, setEditChequePayeeName] = useState('');
  const [editChequeDateBs, setEditChequeDateBs] = useState('');
  const [editBillNo, setEditBillNo] = useState('');
  const [editApprovedByOption, setEditApprovedByOption] = useState('Principal (प्रधानाध्यापक)');
  const [editCustomApprovedBy, setEditCustomApprovedBy] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // ── ACCOUNTS PAYABLE (भुक्तानी गर्न बाँकी हिसाब) STATE ─────────────────────
  const [activeTab, setActiveTab] = useState<'ALL_EXPENSES' | 'ACCOUNTS_PAYABLE'>('ALL_EXPENSES');
  const [isRecordBillModalOpen, setIsRecordBillModalOpen] = useState(false);
  const [isPayInstallmentModalOpen, setIsPayInstallmentModalOpen] = useState(false);
  const [selectedPayableBill, setSelectedPayableBill] = useState<any>(null);

  // New Bill Form State
  const [billAcademicYearId, setBillAcademicYearId] = useState('');
  const [billPartyId, setBillPartyId] = useState('');
  const [billHeadId, setBillHeadId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDateBs, setBillDateBs] = useState(todayBS());
  const [billTotalAmount, setBillTotalAmount] = useState('');
  const [billInitialPaid, setBillInitialPaid] = useState('');
  const [billPaymentMedium, setBillPaymentMedium] = useState('CHEQUE');
  const [billBankAccountId, setBillBankAccountId] = useState('');
  const [billChequeNo, setBillChequeNo] = useState('');
  const [billDescription, setBillDescription] = useState('');

  // Installment Payment Form State
  const [instAmount, setInstAmount] = useState('');
  const [instDateBs, setInstDateBs] = useState(todayBS());
  const [instPaymentMedium, setInstPaymentMedium] = useState('CHEQUE');
  const [instBankAccountId, setInstBankAccountId] = useState('');
  const [instChequeNo, setInstChequeNo] = useState('');
  const [instChequePayeeName, setInstChequePayeeName] = useState('');
  const [instVoucherNo, setInstVoucherNo] = useState('');
  const [instRemarks, setInstRemarks] = useState('');

  // Edit Payable Bill State
  const [editingPayableBill, setEditingPayableBill] = useState<any>(null);
  const [editPayBillNo, setEditPayBillNo] = useState('');
  const [editPayBillDateBs, setEditPayBillDateBs] = useState('');
  const [editPayBillPartyId, setEditPayBillPartyId] = useState('');
  const [editPayBillHeadId, setEditPayBillHeadId] = useState('');
  const [editPayBillTotalAmount, setEditPayBillTotalAmount] = useState('');
  const [editPayBillDescription, setEditPayBillDescription] = useState('');
  const [isDeletingBill, setIsDeletingBill] = useState(false);

  // ── 1. QUERIES ──────────────────────────────────────────────────────────────
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Resolve current filtered year ID
  const effectiveYearId = selectedYearFilter === 'ALL'
    ? ''
    : selectedYearFilter === 'ACTIVE'
    ? (activeYear?.id ? String(activeYear.id) : '')
    : selectedYearFilter;

  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await api.get('/expense/categories');
      return res.data?.data || [];
    },
  });

  const { data: headsData } = useQuery({
    queryKey: ['expense-heads'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  const { data: partiesData } = useQuery({
    queryKey: ['parties-list'],
    queryFn: async () => {
      const res = await api.get('/parties');
      return res.data?.data || [];
    },
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['expense-entries', selectedCategory, selectedHeadFilter, selectedPartyFilter, searchQuery, effectiveYearId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedHeadFilter) params.append('headId', selectedHeadFilter);
      if (selectedPartyFilter) params.append('partyId', selectedPartyFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (effectiveYearId) params.append('academicYearId', effectiveYearId);
      const res = await api.get(`/expense/entries?${params.toString()}`);
      return res.data;
    },
  });

  // Party Voucher Details Query
  const { data: partyVouchersData } = useQuery({
    queryKey: ['party-vouchers', inspectPartyId],
    queryFn: async () => {
      if (!inspectPartyId) return null;
      const res = await api.get(`/parties/${inspectPartyId}/vouchers`);
      return res.data?.data;
    },
    enabled: !!inspectPartyId,
  });

  // ── 2. MUTATIONS ────────────────────────────────────────────────────────────
  const createExpenseHeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expense/heads', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('New Expense Topic created!');
      queryClient.invalidateQueries({ queryKey: ['expense-heads'] });
      setIsAddHeadModalOpen(false);
      setNewHeadCode('');
      setNewHeadName('');
      setNewHeadNameNepali('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create expense topic.');
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/parties', payload);
      return res.data;
    },
    onSuccess: (res: any) => {
      toast.success('New Party/Recipient saved!');
      queryClient.invalidateQueries({ queryKey: ['parties-list'] });
      if (res?.data?.id) setSelectedPartyId(res.data.id.toString());
      setIsAddPartyModalOpen(false);
      setNewPartyName('');
      setNewPartyNameNepali('');
      setNewPartyPan('');
      setNewPartyPhone('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create party/recipient.');
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/expense/entries', {
        ...formData,
        academicYearId: formData.academicYearId ? parseInt(formData.academicYearId) : (expenseFormYearId ? parseInt(expenseFormYearId) : (activeYear?.id || 1)),
        expenseDateAd: new Date().toISOString().slice(0, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense recorded successfully!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record expense');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });

    data.paymentMedium = paymentMedium;
    if (selectedPartyId) {
      data.partyId = parseInt(selectedPartyId);
      const partyObj = partiesData?.find((p: any) => p.id.toString() === selectedPartyId);
      if (partyObj) data.paidTo = partyObj.name;
    }

    if (paymentMedium === 'CASH') {
      data.bankAccountId = null;
      data.paidFromAccount = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
      data.chequeNo = null;
      data.chequePayeeName = null;
    } else if (selectedBankAcc) {
      const bankObj = bankAccountsData?.find((b: any) => b.id.toString() === selectedBankAcc);
      if (bankObj) {
        data.bankAccountId = bankObj.id;
        data.paidFromAccount = `${bankObj.bankName} (${bankObj.accountNo})`;
      }
    }

    const finalApprovedBy = approvedByOption === 'CUSTOM' ? customApprovedBy : approvedByOption;
    if (finalApprovedBy) data.approvedBy = finalApprovedBy;

    addExpenseMutation.mutate(data);
  };

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/expense/entries/${id}`, {
        ...data,
        academicYearId: editAcademicYearId ? parseInt(editAcademicYearId) : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense entry updated successfully');
      setEditingExpense(null);
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update expense');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/expense/entries/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense entry deleted');
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    },
  });

  const handleOpenEditModal = (entry: any) => {
    setEditingExpense(entry);
    setEditAcademicYearId(entry.academicYearId ? entry.academicYearId.toString() : (activeYear?.id ? activeYear.id.toString() : ''));
    setEditHeadId(entry.headId ? entry.headId.toString() : '');
    setEditAmount(entry.amount ? entry.amount.toString() : '');
    setEditExpenseDateBs(entry.expenseDateBs || todayBS());
    setEditPartyId(entry.partyId ? entry.partyId.toString() : '');
    setEditPaidTo(entry.paidTo || '');
    setEditPaymentMedium(entry.paymentMedium || 'CASH');
    setEditBankAccountId(entry.bankAccountId ? entry.bankAccountId.toString() : '');
    setEditPaidFromAccount(entry.paidFromAccount || 'School Operational Account');
    setEditChequeNo(entry.chequeNo || '');
    setEditChequePayeeName(entry.chequePayeeName || '');
    setEditChequeDateBs(entry.chequeDateBs || todayBS());
    setEditBillNo(entry.billNo || '');
    if (['Principal (प्रधानाध्यापक)', 'SMC Chairperson (विद्यालय व्यवस्थापन समिति अध्यक्ष)', 'Accountant (लेखापाल)', 'Vice Principal (सहायक प्र.अ.)'].includes(entry.approvedBy)) {
      setEditApprovedByOption(entry.approvedBy);
      setEditCustomApprovedBy('');
    } else if (entry.approvedBy) {
      setEditApprovedByOption('CUSTOM');
      setEditCustomApprovedBy(entry.approvedBy);
    } else {
      setEditApprovedByOption('Principal (प्रधानाध्यापक)');
      setEditCustomApprovedBy('');
    }
    setEditDescription(entry.description || '');
    setEditRemarks(entry.remarks || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const data: any = {
      headId: parseInt(editHeadId),
      amount: parseFloat(editAmount),
      expenseDateBs: editExpenseDateBs,
      paymentMedium: editPaymentMedium,
      chequePayeeName: editChequePayeeName || null,
      billNo: editBillNo || null,
      description: editDescription || null,
      remarks: editRemarks || null,
    };

    if (editPartyId) {
      data.partyId = parseInt(editPartyId);
      const partyObj = partiesData?.find((p: any) => p.id.toString() === editPartyId);
      data.paidTo = partyObj ? partyObj.name : editPaidTo;
    } else {
      data.partyId = null;
      data.paidTo = editPaidTo || null;
    }

    if (editPaymentMedium === 'CASH') {
      data.bankAccountId = null;
      data.paidFromAccount = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
      data.chequeNo = null;
      data.chequeDateBs = null;
      data.chequePayeeName = null;
    } else if (editBankAccountId) {
      const bankObj = bankAccountsData?.find((b: any) => b.id.toString() === editBankAccountId);
      if (bankObj) {
        data.bankAccountId = bankObj.id;
        data.paidFromAccount = `${bankObj.bankName} (${bankObj.accountNo})`;
      }
    } else {
      data.bankAccountId = null;
      data.paidFromAccount = editPaidFromAccount || 'School Operational Account';
    }

    if (editPaymentMedium === 'CHEQUE' || editPaymentMedium === 'BANK_TRANSFER') {
      data.chequeNo = editChequeNo || null;
      data.chequeDateBs = editChequeDateBs || null;
    }

    const finalApprovedBy = editApprovedByOption === 'CUSTOM' ? editCustomApprovedBy : editApprovedByOption;
    data.approvedBy = finalApprovedBy || 'Principal';

    updateExpenseMutation.mutate({ id: editingExpense.id, data });
  };

  const triggerSingleVoucherPrint = (v: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || 'श्री नेपाल माध्यमिक विद्यालय';
    const sNameEn = schoolProfile?.schoolName || 'Shree Nepal Secondary School';
    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';

    const partyName = v.party?.name || v.paidTo || 'Recipient / Party';
    const partyPan = v.party?.panNo ? ` | PAN: ${v.party.panNo}` : '';
    const topicName = v.head ? `${v.head.code ? `[${v.head.code}] ` : ''}${v.head.name}` : (v.topic || 'Expense Head');
    const amount = v.amount || 0;
    const dateBs = v.expenseDateBs || todayBS();
    const voucherNo = v.voucherNo || `VOUCH-${v.id}`;
    const paymentMedium = v.paymentMedium || 'CASH';
    const chequeNo = v.chequeNo || '';
    const chequePayee = v.chequePayeeName || partyName;
    const account = v.paidFromAccount || 'School Operational Account';
    const approvedBy = v.approvedBy || 'Principal (प्रधानाध्यापक)';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Journal Voucher - ${voucherNo}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 22px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 14px; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
            th { background: #1e3a5f; color: #fff; padding: 8px; text-align: left; font-size: 10px; border: 1px solid #1e3a5f; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
            .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 160px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${sNameNp}</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${sNameEn}, ${sAddress}</div>
              <div class="badge">OFFICIAL GOVERNMENT FORMAT JOURNAL VOUCHER (गोश्वारा भौचर)</div>
            </div>

            <div class="meta-grid">
              <div>Voucher No: <strong>${voucherNo}</strong> ${v.billNo ? `| Bill No: <strong>${v.billNo}</strong>` : ''}</div>
              <div>Date (BS): <strong>${dateBs}</strong></div>
              <div>Paid To / Party: <strong style="color: #1e3a5f;">${partyName}${partyPan}</strong></div>
              <div>Payment Mode: <strong>${paymentMedium}</strong> ${chequeNo ? `| Cheque No: <strong style="color: #6b21a8;">${chequeNo}</strong>` : ''}</div>
              ${chequePayee ? `<div style="grid-column: span 2;">Cheque Payee Name: <strong>${chequePayee}</strong></div>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">S.N.</th>
                  <th>ACCOUNT HEAD & PARTICULARS</th>
                  <th style="width: 130px; text-align: right;">DEBIT (Dr. रू)</th>
                  <th style="width: 130px; text-align: right;">CREDIT (Cr. रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td>
                    <strong>${topicName}</strong>
                    <div style="font-size: 10px; color: #555; margin-top: 2px;">
                      Party/Recipient: ${partyName} | Medium: ${paymentMedium} ${chequeNo ? `(Cheque No: ${chequeNo})` : ''}
                    </div>
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">रू ${amount.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #15803d;">रू ${amount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-bottom: 20px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div><strong>Payment Account / Bank:</strong> ${account}</div>
              <div><strong>Narration / Remarks:</strong> ${v.description || v.remarks || 'Expense Payment Disbursement'}</div>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Prepared By (लेखापाल)</div>
              <div class="sig-box">Checked By (जाँच गर्ने)</div>
              <div class="sig-box">Approved By (${approvedBy})</div>
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

  const triggerFullPartyLedgerPrint = (data: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || 'श्री नेपाल माध्यमिक विद्यालय';
    const sNameEn = schoolProfile?.schoolName || 'Shree Nepal Secondary School';
    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';

    const party = data.party || {};
    const expenses = data.expenses || [];
    const totalExp = data.totalExpenseSum || 0;
    const totalInc = data.totalIncomeSum || 0;
    const netBal = totalExp - totalInc;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Party Ledger Statement - ${party.name || 'Party'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 20px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .party-header { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 11px; }
            .summary-box { display: flex; justify-content: space-between; background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
            th { background: #1e3a5f; color: #fff; padding: 6px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 6px; border: 1px solid #cbd5e1; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 150px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${sNameNp}</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${sNameEn}, ${sAddress}</div>
              <div style="font-size: 12px; font-weight: 900; color: #1e3a5f; margin-top: 4px; text-transform: uppercase;">PARTY LEDGER STATEMENT & VOUCHER REGISTER (पाउने व्यक्ति/संस्था खाता लेजर)</div>
            </div>

            <div class="party-header">
              <div style="font-size: 14px; font-weight: 900; color: #1e3a5f;">Party Name: ${party.name} ${party.nameNepali ? `(${party.nameNepali})` : ''}</div>
              <div>PAN/VAT No: <strong>${party.panNo || 'N/A'}</strong> | Phone: <strong>${party.phone || 'N/A'}</strong> | Type: <strong>${party.partyType || 'VENDOR'}</strong></div>
            </div>

            <div class="summary-box">
              <div>Total Expenses Paid: <span style="color: #b91c1c;">रू ${totalExp.toLocaleString()}</span></div>
              <div>Total Receipts/Income: <span style="color: #15803d;">रू ${totalInc.toLocaleString()}</span></div>
              <div>Net Ledger Balance: <span style="color: #1e3a5f;">रू ${netBal.toLocaleString()}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N.</th>
                  <th style="width: 75px;">Date (BS)</th>
                  <th style="width: 90px;">Voucher No</th>
                  <th>Topic & Description</th>
                  <th style="width: 120px;">Method / Cheque No</th>
                  <th style="width: 85px; text-align: right;">Amount (रू)</th>
                </tr>
              </thead>
              <tbody>
                ${expenses.map((e: any, idx: number) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td style="font-family: monospace; font-weight: bold;">${e.expenseDateBs}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #1e3a5f;">${e.voucherNo || `VOUCH-${e.id}`}</td>
                    <td><strong>${e.head?.name || 'General Expense'}</strong>${e.description ? `<div style="font-size: 9px; color: #666;">${e.description}</div>` : ''}</td>
                    <td style="font-family: monospace;">${e.paymentMedium}${e.chequeNo ? ` (Chk: ${e.chequeNo})` : ''}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">रू ${(e.amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer-sig">
              <div class="sig-box">Prepared By (लेखापाल)</div>
              <div class="sig-box">Checked By (जाँच गर्ने)</div>
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

  // ── 3. PRINT ALL-IN-ONE SUMMARY JOURNAL VOUCHER (किस्ता भुक्तानी सारांश भौचर) ──
  const triggerBillSummaryVoucherPrint = (bill: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const sNameNp = schoolProfile?.schoolNameNepali || schoolProfile?.schoolName || 'श्री नेपाल माध्यमिक विद्यालय';
    const sNameEn = schoolProfile?.schoolName || 'Shree Nepal Secondary School';
    const sAddress = schoolProfile?.address || 'विश्रामपुर, रौतहट';

    const isFullyPaid = bill.remainingDue <= 0;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Summary Journal Voucher - Bill ${bill.billNo}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 22px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: ${isFullyPaid ? '#ecfdf5' : '#fffbeb'}; color: ${isFullyPaid ? '#047857' : '#b45309'}; display: inline-block; padding: 4px 14px; border-radius: 4px; border: 1px solid ${isFullyPaid ? '#a7f3d0' : '#fde68a'}; margin-top: 4px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 14px; background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .summary-box { display: flex; justify-content: space-between; background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-weight: bold; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
            th { background: #1e3a5f; color: #fff; padding: 8px; text-align: left; font-size: 10px; border: 1px solid #1e3a5f; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
            .footer-sig { margin-top: 45px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 160px; text-align: center; border-top: 1px solid #333; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${sNameNp}</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">${sNameEn}, ${sAddress}</div>
              <div class="badge">
                ${isFullyPaid ? '✓ FULLY SETTLED BILL & INSTALLMENT SUMMARY VOUCHER (एकमुष्ट चुक्ता गोश्वारा भौचर)' : '⚡ ACCOUNTS PAYABLE & INSTALLMENT SETTLEMENT VOUCHER (किस्ता भुक्तानी गोश्वारा भौचर)'}
              </div>
            </div>

            <div class="meta-grid">
              <div>Bill / Invoice No: <strong>${bill.billNo}</strong></div>
              <div>Bill Date (BS): <strong>${bill.billDateBs || bill.dateBs}</strong></div>
              <div>Vendor / Party: <strong style="color: #1e3a5f;">${bill.partyName}</strong> ${bill.panNo ? `(PAN: ${bill.panNo})` : ''}</div>
              <div>Expense Topic: <strong>${bill.headName}</strong></div>
            </div>

            <div class="summary-box">
              <div>Total Bill Amount: <span style="color: #1e3a5f;">रू ${bill.totalBillAmount.toLocaleString()}</span></div>
              <div>Total Paid (Installments): <span style="color: #15803d;">रू ${bill.totalPaidAmount.toLocaleString()}</span></div>
              <div>Balance Due: <span style="color: ${isFullyPaid ? '#15803d' : '#b91c1c'};">${isFullyPaid ? '0 (चुक्ता भएको)' : `रू ${bill.remainingDue.toLocaleString()}`}</span></div>
            </div>

            <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; margin-bottom: 6px; text-transform: uppercase;">
              Installment Payments Breakdown (किस्ता भुक्तानी विवरण):
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">किस्ता #</th>
                  <th style="width: 80px;">Date (BS)</th>
                  <th style="width: 100px;">Voucher No</th>
                  <th>Payment Method & Account</th>
                  <th style="width: 110px;">Cheque / Ref No</th>
                  <th style="width: 95px; text-align: right;">Amount (रू)</th>
                </tr>
              </thead>
              <tbody>
                ${bill.installments.map((inst: any, idx: number) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td style="font-family: monospace; font-weight: bold;">${inst.expenseDateBs}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #1e3a5f;">${inst.voucherNo || `VOUCH-${inst.id}`}</td>
                    <td>${inst.paymentMedium} ${inst.paidFromAccount ? `<span style="color: #666; font-size: 10px;">(${inst.paidFromAccount})</span>` : ''}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #6b21a8;">${inst.chequeNo || '—'}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; color: #15803d;">रू ${(inst.amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="margin-bottom: 20px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div><strong>Narration / Settlement Remarks:</strong> ${bill.description || 'Bill installment disbursement and account settlement'}</div>
              <div><strong>Final Status:</strong> ${isFullyPaid ? 'बिल भुक्तानी पूर्ण रूपमा चुक्ता भएको छ (All dues settled).' : 'आंशिक भुक्तानी भएको र बाँकी रकम तिर्न बाँकी रहेको छ।'}</div>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Prepared By (लेखापाल)</div>
              <div class="sig-box">Checked By (जाँच गर्ने)</div>
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

  // ── 4. ACCOUNTS PAYABLE BILLS AGGREGATION ──────────────────────────────────
  const entries = entriesData?.data || [];
  const totalAmount = entriesData?.totalAmount || 0;

  const payableBillsMap = new Map<string, any>();
  entries.forEach((e: any) => {
    if (e.billNo) {
      const key = `${e.partyId || 'direct'}_${e.billNo.trim()}`;
      if (!payableBillsMap.has(key)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,]+)\]/i);
        if (match) {
          parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        }

        payableBillsMap.set(key, {
          key,
          billNo: e.billNo,
          billDateBs: e.expenseDateBs,
          partyId: e.partyId,
          party: e.party,
          partyName: e.party?.name || e.paidTo || 'Vendor / Supplier',
          panNo: e.party?.panNo || '',
          headId: e.headId,
          head: e.head,
          headName: e.head?.name || 'Expense Head',
          totalBillAmount: parsedTotal,
          totalPaidAmount: 0,
          description: e.description,
          installments: [],
        });
      }

      const bill = payableBillsMap.get(key);
      bill.totalPaidAmount += (e.amount || 0);
      if (bill.totalPaidAmount > bill.totalBillAmount) {
        bill.totalBillAmount = bill.totalPaidAmount;
      }
      bill.installments.push(e);
    }
  });

  const payableBills = Array.from(payableBillsMap.values()).map((b: any) => {
    const remainingDue = Math.max(0, b.totalBillAmount - b.totalPaidAmount);
    let status: 'FULLY_PAID' | 'PARTIAL' | 'UNPAID' = 'FULLY_PAID';
    if (remainingDue > 0 && b.totalPaidAmount > 0) status = 'PARTIAL';
    else if (b.totalPaidAmount === 0 || remainingDue === b.totalBillAmount) status = 'UNPAID';
    return {
      ...b,
      remainingDue,
      status,
    };
  });

  const totalPayableAmount = payableBills.reduce((s, b) => s + b.totalBillAmount, 0);
  const totalSettledAmount = payableBills.reduce((s, b) => s + b.totalPaidAmount, 0);
  const totalOutstandingDue = payableBills.reduce((s, b) => s + b.remainingDue, 0);

  const handleRecordBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNo || !billTotalAmount) {
      toast.error('Please enter Bill No and Total Bill Amount.');
      return;
    }

    const partyObj = partiesData?.find((p: any) => p.id.toString() === billPartyId);
    const initialPaidNum = parseFloat(billInitialPaid || '0');
    const totalBillNum = parseFloat(billTotalAmount);

    const payload: any = {
      academicYearId: billAcademicYearId ? parseInt(billAcademicYearId) : (activeYear?.id || 1),
      headId: billHeadId ? parseInt(billHeadId) : (headsData?.[0]?.id || 1),
      amount: initialPaidNum,
      expenseDateBs: billDateBs || todayBS(),
      billNo: billNo.trim(),
      partyId: billPartyId ? parseInt(billPartyId) : null,
      paidTo: partyObj ? partyObj.name : 'Vendor / Supplier',
      paymentMedium: initialPaidNum > 0 ? billPaymentMedium : 'CASH',
      description: `${billDescription || 'Vendor Purchase Bill'} [Total Bill: Rs. ${totalBillNum.toLocaleString()}]`,
      remarks: initialPaidNum > 0 ? `Initial installment of Rs. ${initialPaidNum.toLocaleString()}` : 'Bill registered pending payment',
      approvedBy: 'Principal (प्रधानाध्यापक)',
    };

    if (initialPaidNum > 0) {
      if (billPaymentMedium === 'CASH') {
        payload.bankAccountId = null;
        payload.paidFromAccount = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
        payload.chequeNo = null;
        payload.chequePayeeName = null;
      } else {
        if (billBankAccountId) {
          const bObj = bankAccountsData?.find((b: any) => b.id.toString() === billBankAccountId);
          if (bObj) {
            payload.bankAccountId = bObj.id;
            payload.paidFromAccount = `${bObj.bankName} (${bObj.accountNo})`;
          }
        }
        if ((billPaymentMedium === 'CHEQUE' || billPaymentMedium === 'BANK_TRANSFER') && billChequeNo) {
          payload.chequeNo = billChequeNo;
          payload.chequePayeeName = partyObj ? partyObj.name : null;
        }
      }
    }

    addExpenseMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Vendor Bill & Payable registered!');
        setIsRecordBillModalOpen(false);
        setBillNo('');
        setBillTotalAmount('');
        setBillInitialPaid('');
        setBillChequeNo('');
        setBillDescription('');
      }
    });
  };

  const handlePayInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayableBill || !instAmount) {
      toast.error('Please enter installment payment amount.');
      return;
    }

    const instNum = parseFloat(instAmount);
    if (isNaN(instNum) || instNum <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    const payload: any = {
      academicYearId: selectedPayableBill.academicYearId || (activeYear?.id || 1),
      headId: selectedPayableBill.headId || (headsData?.[0]?.id || 1),
      amount: instNum,
      expenseDateBs: instDateBs || todayBS(),
      billNo: selectedPayableBill.billNo,
      partyId: selectedPayableBill.partyId || null,
      paidTo: selectedPayableBill.partyName || 'Vendor / Supplier',
      paymentMedium: instPaymentMedium,
      voucherNo: instVoucherNo || undefined,
      description: `Installment Payment for Bill ${selectedPayableBill.billNo} [Total Bill: Rs. ${selectedPayableBill.totalBillAmount.toLocaleString()}]`,
      remarks: instRemarks || `Installment payment of Rs. ${instNum.toLocaleString()}`,
      approvedBy: 'Principal (प्रधानाध्यापक)',
    };

    if (instPaymentMedium === 'CASH') {
      payload.bankAccountId = null;
      payload.paidFromAccount = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
      payload.chequeNo = null;
      payload.chequePayeeName = null;
    } else {
      if (instBankAccountId) {
        const bObj = bankAccountsData?.find((b: any) => b.id.toString() === instBankAccountId);
        if (bObj) {
          payload.bankAccountId = bObj.id;
          payload.paidFromAccount = `${bObj.bankName} (${bObj.accountNo})`;
        }
      }

      if (instPaymentMedium === 'CHEQUE' || instPaymentMedium === 'BANK_TRANSFER') {
        payload.chequeNo = instChequeNo || null;
        payload.chequePayeeName = instChequePayeeName || selectedPayableBill.partyName;
      }
    }

    addExpenseMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Installment of Rs. ${instNum.toLocaleString()} paid!`);
        setIsPayInstallmentModalOpen(false);
        setSelectedPayableBill(null);
        setInstAmount('');
        setInstChequeNo('');
        setInstChequePayeeName('');
        setInstVoucherNo('');
        setInstRemarks('');
      }
    });
  };

  const handleOpenEditPayable = (bill: any) => {
    setEditingPayableBill(bill);
    setEditPayBillNo(bill.billNo || '');
    setEditPayBillDateBs(bill.billDateBs || todayBS());
    setEditPayBillPartyId(bill.partyId ? bill.partyId.toString() : '');
    setEditPayBillHeadId(bill.headId ? bill.headId.toString() : '');
    setEditPayBillTotalAmount(bill.totalBillAmount ? bill.totalBillAmount.toString() : '');
    const cleanDesc = (bill.description || '').replace(/\[Total Bill:\s*[^\]]+\]/i, '').trim();
    setEditPayBillDescription(cleanDesc);
  };

  const handleSaveEditPayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayableBill) return;

    const newTotal = parseFloat(editPayBillTotalAmount);
    if (isNaN(newTotal) || newTotal < 0) {
      toast.error('Please enter a valid total bill amount.');
      return;
    }

    const partyObj = partiesData?.find((p: any) => p.id.toString() === editPayBillPartyId);
    const newPartyName = partyObj ? partyObj.name : editingPayableBill.partyName;
    const cleanDesc = editPayBillDescription ? editPayBillDescription.trim() : 'Vendor Purchase Bill';
    const finalDescription = `${cleanDesc} [Total Bill: Rs. ${newTotal.toLocaleString()}]`;

    try {
      await Promise.all(
        editingPayableBill.installments.map((inst: any, idx: number) => {
          const updatePayload: any = {
            billNo: editPayBillNo.trim(),
            headId: editPayBillHeadId ? parseInt(editPayBillHeadId) : inst.headId,
            partyId: editPayBillPartyId ? parseInt(editPayBillPartyId) : null,
            paidTo: newPartyName,
            description: finalDescription,
          };
          if (idx === 0 && editPayBillDateBs) {
            updatePayload.expenseDateBs = editPayBillDateBs;
          }
          return api.put(`/expense/entries/${inst.id}`, updatePayload);
        })
      );

      toast.success(`Bill "${editPayBillNo}" details updated successfully!`);
      setEditingPayableBill(null);
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update bill details.');
    }
  };

  const handleDeletePayable = async (bill: any) => {
    if (!bill || !bill.installments || bill.installments.length === 0) return;

    const count = bill.installments.length;
    const confirmMsg = count > 1
      ? `Are you sure you want to delete Bill "${bill.billNo}" and all its ${count} payment entries? This will delete these expense entries permanently.`
      : `Are you sure you want to delete Bill "${bill.billNo}"? This action cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setIsDeletingBill(true);
    try {
      await Promise.all(
        bill.installments.map((inst: any) => api.post(`/expense/entries/${inst.id}/delete`))
      );
      toast.success(`Bill "${bill.billNo}" deleted successfully!`);
      queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete bill.');
    } finally {
      setIsDeletingBill(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Expense & Voucher Management (खर्च तथा भुक्तानी व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकार दोहोरो लेखा प्रणाली, खर्च शीर्षक कोड, किस्ता भुक्तानी (Accounts Payable), बैंक/चेक र पाउने व्यक्ति/संस्था लेजर
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddPartyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition"
          >
            <Users size={14} className="text-[#1e3a5f]" />
            <span>+ Add Party (पाउने पक्ष)</span>
          </button>

          <button
            onClick={() => setIsRecordBillModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 shadow-2xs transition"
          >
            <CreditCard size={14} className="text-purple-700" />
            <span>+ Record Bill / Payable (बिल दर्ता)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <Plus size={14} />
            <span>Record Expense (खर्च प्रविष्टि)</span>
          </button>
        </div>
      </div>

      {/* ─── TAB SWITCHER: ALL EXPENSES vs ACCOUNTS PAYABLE ───────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('ALL_EXPENSES')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
            activeTab === 'ALL_EXPENSES'
              ? 'border-[#1e3a5f] text-[#1e3a5f] bg-slate-100/70'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
          }`}
        >
          <Receipt size={15} />
          <span>All Expense Vouchers (खर्च तथा भुक्तानी भौचरहरू)</span>
          <span className="rounded-full bg-[#1e3a5f] text-white px-2 py-0.5 text-[10px] font-mono">
            {entries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ACCOUNTS_PAYABLE')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
            activeTab === 'ACCOUNTS_PAYABLE'
              ? 'border-purple-700 text-purple-900 bg-purple-50/70'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
          }`}
        >
          <CreditCard size={15} />
          <span>Accounts Payable & Bill Installments (भुक्तानी गर्न बाँकी हिसाब तथा किस्ता)</span>
          <span className="rounded-full bg-purple-700 text-white px-2 py-0.5 text-[10px] font-mono">
            {payableBills.length}
          </span>
        </button>
      </div>

      {activeTab === 'ALL_EXPENSES' ? (
        <>
          {/* ─── 2. SUMMARY METRIC CARDS ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Expenses (Year {activeYear?.year || '2081-82'})</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-2">रू {totalAmount.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1">कुल निकासा भएको खर्च रकम</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Staff Salary & Allowances</span>
              <p className="text-2xl font-extrabold text-[#1e3a5f] mt-2">
                रू {entries
                  .filter((e: any) => e.head?.category?.name?.includes('Salary') || e.head?.name?.includes('Salary') || e.head?.code?.startsWith('5'))
                  .reduce((s: number, e: any) => s + (e.amount || 0), 0)
                  .toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">शिक्षक/कर्मचारी तलब तथा संचय कोष</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Operational & Maintenance</span>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">
                रू {entries
                  .filter((e: any) => !e.head?.name?.includes('Salary'))
                  .reduce((s: number, e: any) => s + (e.amount || 0), 0)
                  .toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">स्टेशनरी, मर्मत, बिजुली, पानी तथा अन्य</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Registered Parties / Vendors</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-2">{partiesData?.length || 0}</p>
              <p className="text-[11px] text-gray-400 mt-1">सूचीकृत पाउने व्यक्ति/संस्था</p>
            </div>
          </div>

          {/* ─── 3. FILTERS & SEARCH BAR ───────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by party, bill no, voucher, cheque no, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
                />
              </div>

              {/* Fiscal Year Filter */}
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="rounded-xl border border-rose-300 bg-rose-50/70 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-bold text-rose-950 shadow-2xs"
              >
                <option value="ACTIVE">चालु आ.व. ({activeYear?.year || '2083-84'})</option>
                <option value="ALL">सबै आर्थिक वर्षहरू (All Fiscal Years)</option>
                {yearsData?.map((y: any) => (
                  <option key={y.id} value={y.id}>
                    आ.व. {y.year} {y.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>

              {/* Expense Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedHeadFilter('');
                }}
                className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
              >
                <option value="">All Categories (सबै समूह)</option>
                {categoriesData?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Expense Head with Code Filter */}
              <select
                value={selectedHeadFilter}
                onChange={(e) => setSelectedHeadFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
              >
                <option value="">All Expense Topics (सबै खर्च शीर्षक)</option>
                {headsData?.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.code ? `[Code: ${h.code}] ` : ''}{h.name}
                  </option>
                ))}
              </select>

              {/* Party Filter */}
              <select
                value={selectedPartyFilter}
                onChange={(e) => setSelectedPartyFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-medium"
              >
                <option value="">All Parties/Vendors (सबै पाउने पक्ष)</option>
                {partiesData?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-gray-500 font-mono">
              Showing <b>{entries.length}</b> expense vouchers
            </span>
          </div>

          {/* ─── 4. EXPENSE ENTRIES TABLE ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#1e3a5f] text-white uppercase text-[10.5px] tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Date (BS)</th>
                    <th className="py-3 px-4">Voucher / Bill No</th>
                    <th className="py-3 px-4">Expense Topic (शीर्षक & Code)</th>
                    <th className="py-3 px-4">Paid To / Recipient (पाउने व्यक्ति/संस्था)</th>
                    <th className="py-3 px-4">Payment Method & Account</th>
                    <th className="py-3 px-4 text-right">Amount (रकम)</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent mx-auto mb-2" />
                        Loading expense records...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-nepali">
                        कुनै खर्च प्रविष्टि भेटिएन। ("Record Expense" बटन थिचेर नयाँ खर्च थप्नुहोस्।)
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {entry.expenseDateBs}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#1e3a5f] block">
                            {entry.voucherNo || `VOUCH-${entry.id}`}
                          </span>
                          {entry.billNo && (
                            <span className="text-[10px] text-gray-400 font-mono">Bill: {entry.billNo}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {entry.head?.code && (
                              <span className="rounded-md bg-slate-100 text-[#1e3a5f] px-1.5 py-0.5 text-[10px] font-black font-mono border border-slate-200">
                                {entry.head.code}
                              </span>
                            )}
                            <span className="font-bold text-gray-900">{entry.head?.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-nepali block mt-0.5">
                            {entry.head?.category?.name || 'General Expense'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {entry.party ? (
                            <button
                              onClick={() => setInspectPartyId(entry.party.id)}
                              className="font-bold text-rose-700 hover:underline inline-flex items-center gap-1"
                            >
                              <Building size={12} />
                              <span>{entry.party.name}</span>
                            </button>
                          ) : (
                            <span className="font-bold text-gray-800">{entry.paidTo || '—'}</span>
                          )}
                          {entry.chequePayeeName && (
                            <span className="text-[10.5px] font-bold text-purple-900 block mt-0.5 font-sans">
                              💳 Payee: {entry.chequePayeeName}
                            </span>
                          )}
                          {entry.description && (
                            <span className="text-[10px] text-gray-500 block truncate max-w-xs">{entry.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              entry.paymentMedium === 'CHEQUE' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              entry.paymentMedium === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {entry.paymentMedium || 'CASH'}
                            </span>
                            {entry.chequeNo && (
                              <span className="font-mono text-[10px] font-bold text-purple-900">
                                Chk: {entry.chequeNo}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 block truncate max-w-xs mt-0.5">
                            {entry.paidFromAccount || 'School Operational Account'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm whitespace-nowrap">
                          रू {(entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-600">
                          {entry.approvedBy || 'Principal'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => triggerSingleVoucherPrint(entry)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[11px] font-extrabold shadow-2xs transition"
                              title="Print Single Official Journal Voucher"
                            >
                              <Printer size={12} />
                              <span>Voucher</span>
                            </button>

                            {entry.partyId && (
                              <button
                                onClick={() => setInspectPartyId(entry.partyId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-[#1e3a5f] hover:bg-slate-100 shadow-2xs transition"
                                title="View Party History & Full Ledger"
                              >
                                <Eye size={12} />
                                <span>Ledger</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(entry)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                              title="Edit Expense Details"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this expense entry?')) {
                                  deleteExpenseMutation.mutate(entry.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[11px] font-bold shadow-2xs transition"
                              title="Delete Expense Entry"
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
        </>
      ) : (
        /* ─── ACCOUNTS PAYABLE & BILL INSTALLMENTS VIEW ────────────────────────── */
        <div className="space-y-6">
          {/* Payable Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Registered Bills (कुल बिल)</span>
              <p className="text-2xl font-extrabold text-[#1e3a5f] mt-2">रू {totalPayableAmount.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1">विक्रेता तथा आपूर्तिकर्ताका बिल रकम</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Settled / Paid (भुक्तान रकम)</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-2">रू {totalSettledAmount.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1">किस्ता तथा एकमुष्ट चुक्ता भएको</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Balance Due (भुक्तानी गर्न बाँकी)</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-2">रू {totalOutstandingDue.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1">बाँकी तिर्नुपर्ने बक्यौता दायित्व</p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Settled Bills Ratio</span>
              <p className="text-2xl font-extrabold text-purple-800 mt-2">
                {payableBills.filter((b: any) => b.status === 'FULLY_PAID').length} / {payableBills.length}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">पूर्ण रूपमा चुक्ता भएका बिलहरू</p>
            </div>
          </div>

          {/* Accounts Payable Table */}
          <div className="rounded-2xl border border-purple-200 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 bg-purple-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-400" />
                  <span>Accounts Payable Register & Installment Settlements (भुक्तानी गर्न बाँकी हिसाब लेजर)</span>
                </h3>
                <p className="text-[11px] text-purple-200 mt-0.5">
                  विक्रेताहरूको बिल अनुसार किस्ता भुक्तानी ट्र्याक गर्नुहोस् र पूर्ण चुक्ता भएपछि एकमुष्ट गोश्वारा भौचर निकाल्नुहोस्।
                </p>
              </div>

              <button
                onClick={() => setIsRecordBillModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-extrabold px-3.5 py-1.5 text-xs shadow-sm transition"
              >
                <Plus size={14} />
                <span>+ Register New Bill (नयाँ बिल दर्ता)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 text-gray-700 uppercase text-[10.5px] tracking-wider font-extrabold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Bill No & Date</th>
                    <th className="py-3 px-4">Vendor / Party</th>
                    <th className="py-3 px-4">Expense Topic</th>
                    <th className="py-3 px-4 text-right">Total Bill (रू)</th>
                    <th className="py-3 px-4 text-right">Paid (रू)</th>
                    <th className="py-3 px-4 text-right">Balance Due (रू)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions & Summary JV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {payableBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-nepali">
                        कुनै बिल/भुक्तानी बाँकी हिसाब दर्ता भएको छैन। ("+ Register New Bill" थिचेर दर्ता गर्नुहोस्।)
                      </td>
                    </tr>
                  ) : (
                    payableBills.map((bill: any) => (
                      <tr key={bill.key} className="hover:bg-purple-50/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-extrabold text-[#1e3a5f] block">
                            {bill.billNo}
                          </span>
                          <span className="text-[10.5px] font-mono text-gray-500 font-bold">
                            Date: {bill.billDateBs}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{bill.partyName}</span>
                          {bill.panNo && (
                            <span className="text-[10px] text-gray-500 font-mono">PAN: {bill.panNo}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-800">{bill.headName}</span>
                          {bill.description && (
                            <span className="text-[10px] text-gray-500 block truncate max-w-xs">{bill.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                          रू {bill.totalBillAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                          रू {bill.totalPaidAmount.toLocaleString()}
                          <span className="text-[10px] text-gray-400 block font-sans">
                            ({bill.installments.length} installment{bill.installments.length > 1 ? 's' : ''})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          रू {bill.remainingDue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block rounded-md px-2.5 py-1 text-[10.5px] font-black uppercase ${
                            bill.status === 'FULLY_PAID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : bill.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {bill.status === 'FULLY_PAID' ? '✓ चुक्ता भएको' : bill.status === 'PARTIAL' ? '⚡ आंशिक किस्ता' : '⏳ बाँकी (Unpaid)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {bill.remainingDue > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedPayableBill(bill);
                                  setInstAmount(bill.remainingDue.toString());
                                  setInstDateBs(todayBS());
                                  setIsPayInstallmentModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition"
                                title="Pay Bill Installment"
                              >
                                <CreditCard size={12} />
                                <span>+ Pay Installment</span>
                              </button>
                            )}

                            <button
                              onClick={() => triggerBillSummaryVoucherPrint(bill)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 py-1 text-[11px] font-extrabold shadow-2xs transition"
                              title="Print All-in-One Summary Journal Voucher"
                            >
                              <Printer size={12} />
                              <span>Summary JV</span>
                            </button>

                            {bill.partyId && (
                              <button
                                onClick={() => setInspectPartyId(bill.partyId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-[#1e3a5f] hover:bg-slate-100 shadow-2xs transition"
                                title="View Party History & Full Ledger"
                              >
                                <Eye size={12} />
                                <span>Ledger</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditPayable(bill)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 shadow-2xs transition"
                              title="Edit Bill & Payable Details (बिल सम्पादन)"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeletePayable(bill)}
                              disabled={isDeletingBill}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition disabled:opacity-50"
                              title="Delete Bill and Associated Entries (बिल खारेज)"
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

      {/* ─── 5. RECORD BILL / PAYABLE MODAL ────────────────────────────────────── */}
      {isRecordBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-purple-950 flex items-center gap-2">
                  <CreditCard size={18} className="text-purple-700" />
                  <span>Register Vendor Bill / Payable (नयाँ बिल दर्ता)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  विक्रेता/आपूर्तिकर्ताको बिल दर्ता गरी किस्ताबन्दी भुक्तानी ट्र्याक गर्नुहोस्
                </p>
              </div>
              <button onClick={() => setIsRecordBillModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordBillSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-extrabold text-purple-950 mb-1">
                    आर्थिक वर्ष (Fiscal Year) *
                  </label>
                  <select
                    value={billAcademicYearId || activeYear?.id || ''}
                    onChange={(e) => setBillAcademicYearId(e.target.value)}
                    className="erp-input font-bold text-[#1e3a5f]"
                    required
                  >
                    {yearsData?.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        आ.व. {y.year} {y.isActive ? '(चालु आ.व.)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Vendor / Party (पाउने व्यक्ति/संस्था) *
                  </label>
                  <select
                    value={billPartyId}
                    onChange={(e) => setBillPartyId(e.target.value)}
                    required
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Party / Vendor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Head / Topic (खर्च शीर्षक) *
                  </label>
                  <select
                    value={billHeadId}
                    onChange={(e) => setBillHeadId(e.target.value)}
                    required
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Expense Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill / Invoice No (बिल नं.) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. BILL-4091"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="erp-input font-mono font-bold"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill Date BS (मिति) *
                  </label>
                  <input
                    required
                    type="text"
                    value={billDateBs}
                    onChange={(e) => setBillDateBs(formatDateInput(e.target.value))}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Total Bill Amount in रू *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    placeholder="e.g. 50000"
                    value={billTotalAmount}
                    onChange={(e) => setBillTotalAmount(e.target.value)}
                    className="erp-input font-mono font-extrabold text-purple-900"
                  />
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3">
                <div className="font-extrabold text-purple-950 text-[11px] uppercase">
                  Initial Down Payment (पहिलो किस्ता/अग्रिम भुक्तानी - ऐच्छिक):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Initial Paid (रू)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0 if not paid yet"
                      value={billInitialPaid}
                      onChange={(e) => setBillInitialPaid(e.target.value)}
                      className="erp-input font-mono font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Payment Medium</label>
                    <select
                      value={billPaymentMedium}
                      onChange={(e) => setBillPaymentMedium(e.target.value)}
                      className="erp-input font-bold"
                    >
                      <option value="CASH">Cash (नगद भुक्तानी - Cash A/c)</option>
                      <option value="CHEQUE">Cheque (चेक)</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {parseFloat(billInitialPaid || '0') > 0 && billPaymentMedium === 'CASH' && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-2.5 text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <span>💵</span>
                    <span>Disbursing From: <strong>विद्यालय नगद खाता (School Cash / Petty Cash A/c)</strong></span>
                  </div>
                )}

                {parseFloat(billInitialPaid || '0') > 0 && billPaymentMedium !== 'CASH' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">School Bank Account *</label>
                      <select
                        value={billBankAccountId}
                        onChange={(e) => setBillBankAccountId(e.target.value)}
                        className="erp-input font-bold"
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccountsData?.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Cheque No (चेक नं.)</label>
                      <input
                        type="text"
                        placeholder="e.g. 984124"
                        value={billChequeNo}
                        onChange={(e) => setBillChequeNo(e.target.value)}
                        className="erp-input font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Description / Particulars (विवरण)
                </label>
                <textarea
                  rows={2}
                  placeholder="Purchase of furniture, laboratory equipment, or maintenance..."
                  value={billDescription}
                  onChange={(e) => setBillDescription(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecordBillModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-sm"
                >
                  {addExpenseMutation.isPending ? 'Registering...' : 'Register Bill & Payable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. PAY INSTALLMENT MODAL ─────────────────────────────────────────── */}
      {isPayInstallmentModalOpen && selectedPayableBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-purple-950 flex items-center gap-2">
                  <CreditCard size={18} className="text-purple-700" />
                  <span>Pay Bill Installment (किस्ता भुक्तानी)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  Bill No: <strong className="font-mono text-purple-900">{selectedPayableBill.billNo}</strong> | Party: <strong>{selectedPayableBill.partyName}</strong>
                </p>
              </div>
              <button onClick={() => setIsPayInstallmentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-purple-50 p-3 rounded-xl border border-purple-200 text-center">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Bill</span>
                <p className="text-sm font-extrabold text-gray-900 font-mono">रू {selectedPayableBill.totalBillAmount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Paid So Far</span>
                <p className="text-sm font-extrabold text-emerald-700 font-mono">रू {selectedPayableBill.totalPaidAmount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Remaining Due</span>
                <p className="text-sm font-extrabold text-rose-700 font-mono">रू {selectedPayableBill.remainingDue.toLocaleString()}</p>
              </div>
            </div>

            <form onSubmit={handlePayInstallmentSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Installment Amount (किस्ता रकम रू) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={instAmount}
                    onChange={(e) => setInstAmount(e.target.value)}
                    className="erp-input font-mono font-extrabold text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Payment Date BS (मिति) *
                  </label>
                  <input
                    required
                    type="text"
                    value={instDateBs}
                    onChange={(e) => setInstDateBs(formatDateInput(e.target.value))}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Payment Medium (भुक्तानी विधि) *
                </label>
                <select
                  value={instPaymentMedium}
                  onChange={(e) => setInstPaymentMedium(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="CASH">Cash (नगद भुक्तानी - Cash A/c)</option>
                  <option value="CHEQUE">Cheque (चेक)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              {instPaymentMedium === 'CASH' ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-emerald-950 flex items-center gap-2">
                  <span className="text-base">💵</span>
                  <span>Disbursing From: <strong>विद्यालय नगद खाता (School Cash / Petty Cash A/c)</strong></span>
                </div>
              ) : (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        School Bank Account *
                      </label>
                      <select
                        value={instBankAccountId}
                        onChange={(e) => setInstBankAccountId(e.target.value)}
                        className="erp-input font-bold"
                        required={instPaymentMedium !== 'CASH'}
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccountsData?.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        Cheque No (चेक नं.)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 509214"
                        value={instChequeNo}
                        onChange={(e) => setInstChequeNo(e.target.value)}
                        className="erp-input font-mono font-bold text-purple-900 border-purple-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-purple-950 mb-1">
                      Cheque Payee Name (चेक पाउनेको नाम)
                    </label>
                    <input
                      type="text"
                      placeholder={selectedPayableBill.partyName}
                      value={instChequePayeeName}
                      onChange={(e) => setInstChequePayeeName(e.target.value)}
                      className="erp-input font-bold border-purple-300"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Custom Voucher No (ऐच्छिक)
                </label>
                <input
                  type="text"
                  placeholder="Auto Generated if blank"
                  value={instVoucherNo}
                  onChange={(e) => setInstVoucherNo(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  School Bank Account (बैंक खाता)
                </label>
                <select
                  value={instBankAccountId}
                  onChange={(e) => setInstBankAccountId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="">-- Select Bank Account --</option>
                  {bankAccountsData?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Remarks (कैफियत)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Installment payment for school furniture"
                  value={instRemarks}
                  onChange={(e) => setInstRemarks(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPayInstallmentModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="rounded-xl bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 shadow-sm"
                >
                  {addExpenseMutation.isPending ? 'Processing...' : 'Disburse Installment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. RECORD EXPENSE MODAL ──────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <TrendingDown size={18} className="text-rose-600" />
                  <span>Record School Expense (खर्च प्रविष्टि)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  नेपाल सरकार ढाँचा बमोजिम खर्च शीर्षक कोड, पाउने व्यक्ति/संस्था, बैंक/चेक र स्वीकृत अधिकारी प्रविष्टि
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Row 0: Fiscal Year Selector */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <label className="block font-extrabold text-[#1e3a5f] mb-1">
                  आर्थिक वर्ष (Fiscal Year) *
                </label>
                <select
                  value={expenseFormYearId || activeYear?.id || ''}
                  onChange={(e) => setExpenseFormYearId(e.target.value)}
                  className="erp-input font-bold text-[#1e3a5f]"
                  required
                >
                  {yearsData?.map((y: any) => (
                    <option key={y.id} value={y.id}>
                      आ.व. {y.year} {y.isActive ? '(चालु आ.व.)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 1: Searchable Expense Topic & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-gray-800">
                      Expense Topic / Head (शीर्षक & Code) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddHeadModalOpen(true)}
                      className="text-[10px] font-extrabold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Topic (नयाँ शीर्षक)</span>
                    </button>
                  </div>
                  <select name="headId" required className="erp-input font-bold">
                    <option value="">-- Select Expense Topic (शीर्षक छनौट) --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Amount in रू (खर्च रकम) *
                  </label>
                  <input
                    required
                    name="amount"
                    type="number"
                    step="any"
                    placeholder="e.g. 15000"
                    className="erp-input font-bold text-rose-700 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Expense Date & Recipient / Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Date in BS (YYYY-MM-DD) *
                  </label>
                  <input
                    required
                    name="expenseDateBs"
                    type="text"
                    value={addExpenseDateBs}
                    onChange={(e) => setAddExpenseDateBs(formatDateInput(e.target.value))}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-gray-800">
                      Paid To / Recipient (पाउने व्यक्ति/संस्था)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="text-[10px] font-extrabold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                      <span>+ Add Party (नयाँ पाउने पक्ष)</span>
                    </button>
                  </div>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="">-- Select Saved Party / Vendor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                      </option>
                    ))}
                  </select>
                  {!selectedPartyId && (
                    <input
                      name="paidTo"
                      type="text"
                      placeholder="Or type Recipient / Vendor name manually..."
                      className="erp-input font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: Payment Method & Paid From Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Payment Method (भुक्तानी विधि)
                  </label>
                  <select
                    value={paymentMedium}
                    onChange={(e) => setPaymentMedium(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="CASH">CASH (नगद भुक्तानी)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (बैंक ट्रान्सफर)</option>
                    <option value="CHEQUE">CHEQUE (चेक मार्फत)</option>
                    <option value="QR_CODE">QR CODE (क्युआर कोड)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Paid From Account (कुन खाताबाट)
                  </label>
                  {paymentMedium === 'CASH' ? (
                    <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>💵</span>
                      <span>विद्यालय नगद खाता (School Cash / Petty Cash A/c)</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedBankAcc}
                        onChange={(e) => setSelectedBankAcc(e.target.value)}
                        className="erp-input font-bold mb-1"
                      >
                        <option value="">-- Select School Bank Account --</option>
                        {bankAccountsData?.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountName} ({b.accountNo})
                          </option>
                        ))}
                      </select>
                      {!selectedBankAcc && (
                        <input
                          name="paidFromAccount"
                          type="text"
                          defaultValue="School Operational Account"
                          className="erp-input"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Conditional Cheque Details */}
              {(paymentMedium === 'CHEQUE' || paymentMedium === 'BANK_TRANSFER') && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        Cheque / Trans Ref No. (चेक नम्बर) *
                      </label>
                      <input
                        name="chequeNo"
                        type="text"
                        placeholder="e.g. CHQ-98765432"
                        className="erp-input font-mono font-bold border-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        Cheque Date in BS (चेक मिति)
                      </label>
                      <input
                        name="chequeDateBs"
                        type="text"
                        value={addChequeDateBs}
                        onChange={(e) => setAddChequeDateBs(formatDateInput(e.target.value))}
                        className="erp-input font-mono font-bold border-purple-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-extrabold text-purple-950 mb-1">
                      Cheque Issued To / Payee Name (चेक कसको नाममा जारी गरियो - Account Holder)
                    </label>
                    <input
                      name="chequePayeeName"
                      type="text"
                      placeholder="Specify Account Holder Name if different from Shop/Firm Name (e.g. Ram Kumar Sharma)"
                      className="erp-input font-bold border-purple-300"
                    />
                    <span className="text-[10px] text-purple-700 font-medium block mt-0.5">
                      💡 Use this if the shop/vendor name is different from the personal account owner receiving the cheque/transfer.
                    </span>
                  </div>
                </div>
              )}

              {/* Row 4: Bill No & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill / Voucher Number (बिल/भौचर नं)
                  </label>
                  <input
                    name="billNo"
                    type="text"
                    placeholder="BILL-2083-042"
                    className="erp-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Approved By (स्वीकृत गर्ने अधिकारी)
                  </label>
                  <select
                    value={approvedByOption}
                    onChange={(e) => setApprovedByOption(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="Principal (प्रधानाध्यापक)">Principal (प्रधानाध्यापक)</option>
                    <option value="SMC Chairperson (विद्यालय व्यवस्थापन समिति अध्यक्ष)">SMC Chairperson (वि.व्य.स. अध्यक्ष)</option>
                    <option value="Accountant (लेखापाल)">Accountant (लेखापाल)</option>
                    <option value="Vice Principal (सहायक प्र.अ.)">Vice Principal (सहायक प्र.अ.)</option>
                    <option value="CUSTOM">Other Authority (अन्य लेख्नुहोस्)...</option>
                  </select>
                  {approvedByOption === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Type Authority Name..."
                      value={customApprovedBy}
                      onChange={(e) => setCustomApprovedBy(e.target.value)}
                      className="erp-input"
                    />
                  )}
                </div>
              </div>

              {/* Particulars & Remarks */}
              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Description / Particulars (खर्चको विवरण)
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="Details of purchased stationery, repair work, event expenses..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">Remarks (कैफियत)</label>
                <textarea name="remarks" rows={2} placeholder="Any extra remarks..." className="erp-input" />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="rounded-xl bg-rose-600 px-6 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-60 shadow-xs"
                >
                  {addExpenseMutation.isPending ? 'Saving...' : 'Save Expense (खर्च सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5.5 EDIT EXPENSE MODAL ──────────────────────────────────────────── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Edit2 size={18} className="text-blue-600" />
                  <span>Edit Expense Details (खर्च विवरण सम्पादन)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  Voucher No: <b className="font-mono text-[#1e3a5f]">{editingExpense.voucherNo || `VOUCH-${editingExpense.id}`}</b>
                </p>
              </div>
              <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Row 0: Fiscal Year Selector */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <label className="block font-extrabold text-[#1e3a5f] mb-1">
                  आर्थिक वर्ष (Fiscal Year) *
                </label>
                <select
                  value={editAcademicYearId || activeYear?.id || ''}
                  onChange={(e) => setEditAcademicYearId(e.target.value)}
                  className="erp-input font-bold text-[#1e3a5f]"
                  required
                >
                  {yearsData?.map((y: any) => (
                    <option key={y.id} value={y.id}>
                      आ.व. {y.year} {y.isActive ? '(चालु आ.व.)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 1: Expense Topic & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Topic / Head (शीर्षक & Code) *
                  </label>
                  <select
                    value={editHeadId}
                    onChange={(e) => setEditHeadId(e.target.value)}
                    required
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Expense Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.code ? `[${h.code}] ` : ''}{h.name} {h.nameNepali ? `(${h.nameNepali})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Amount in रू (खर्च रकम) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="erp-input font-bold text-rose-700 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Expense Date & Recipient / Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Date in BS (YYYY-MM-DD) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editExpenseDateBs}
                    onChange={(e) => setEditExpenseDateBs(formatDateInput(e.target.value))}
                    placeholder="2080-04-03"
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Paid To / Recipient (पाउने व्यक्ति/संस्था)
                  </label>
                  <select
                    value={editPartyId}
                    onChange={(e) => setEditPartyId(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="">-- Select Saved Party / Vendor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                      </option>
                    ))}
                  </select>
                  {!editPartyId && (
                    <input
                      type="text"
                      value={editPaidTo}
                      onChange={(e) => setEditPaidTo(e.target.value)}
                      placeholder="Or type Recipient / Vendor name manually..."
                      className="erp-input font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: Payment Method & Paid From Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Payment Method (भुक्तानी विधि)
                  </label>
                  <select
                    value={editPaymentMedium}
                    onChange={(e) => setEditPaymentMedium(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="CASH">CASH (नगद भुक्तानी)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (बैंक ट्रान्सफर)</option>
                    <option value="CHEQUE">CHEQUE (चेक मार्फत)</option>
                    <option value="QR_CODE">QR CODE (क्युआर कोड)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Paid From Account (कुन खाताबाट)
                  </label>
                  {editPaymentMedium === 'CASH' ? (
                    <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>💵</span>
                      <span>विद्यालय नगद खाता (School Cash / Petty Cash A/c)</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={editBankAccountId}
                        onChange={(e) => setEditBankAccountId(e.target.value)}
                        className="erp-input font-bold mb-1"
                      >
                        <option value="">-- Select School Bank Account --</option>
                        {bankAccountsData?.map((b: any) => (
                          <option key={b.id} value={b.id.toString()}>
                            {b.bankName} - {b.accountName} ({b.accountNo})
                          </option>
                        ))}
                      </select>
                      {!editBankAccountId && (
                        <input
                          type="text"
                          value={editPaidFromAccount}
                          onChange={(e) => setEditPaidFromAccount(e.target.value)}
                          className="erp-input"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Conditional Cheque Details */}
              {(editPaymentMedium === 'CHEQUE' || editPaymentMedium === 'BANK_TRANSFER') && (
                <div className="space-y-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        Cheque / Trans Ref No. (चेक नम्बर)
                      </label>
                      <input
                        type="text"
                        value={editChequeNo}
                        onChange={(e) => setEditChequeNo(e.target.value)}
                        placeholder="e.g. CHQ-98765432"
                        className="erp-input font-mono font-bold border-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-purple-950 mb-1">
                        Cheque Date in BS (चेक मिति)
                      </label>
                      <input
                        type="text"
                        value={editChequeDateBs}
                        onChange={(e) => setEditChequeDateBs(formatDateInput(e.target.value))}
                        className="erp-input font-mono font-bold border-purple-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-extrabold text-purple-950 mb-1">
                      Cheque Issued To / Payee Name (चेक कसको नाममा जारी गरियो - Account Holder)
                    </label>
                    <input
                      type="text"
                      value={editChequePayeeName}
                      onChange={(e) => setEditChequePayeeName(e.target.value)}
                      placeholder="Account Owner Name if different from Shop/Firm Name"
                      className="erp-input font-bold border-purple-300"
                    />
                  </div>
                </div>
              )}

              {/* Row 4: Bill No & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill / Voucher Number (बिल/भौचर नं)
                  </label>
                  <input
                    type="text"
                    value={editBillNo}
                    onChange={(e) => setEditBillNo(e.target.value)}
                    placeholder="BILL-2083-042"
                    className="erp-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Approved By (स्वीकृत गर्ने अधिकारी)
                  </label>
                  <select
                    value={editApprovedByOption}
                    onChange={(e) => setEditApprovedByOption(e.target.value)}
                    className="erp-input font-bold mb-1"
                  >
                    <option value="Principal (प्रधानाध्यापक)">Principal (प्रधानाध्यापक)</option>
                    <option value="SMC Chairperson (विद्यालय व्यवस्थापन समिति अध्यक्ष)">SMC Chairperson (वि.व्य.स. अध्यक्ष)</option>
                    <option value="Accountant (लेखापाल)">Accountant (लेखापाल)</option>
                    <option value="Vice Principal (सहायक प्र.अ.)">Vice Principal (सहायक प्र.अ.)</option>
                    <option value="CUSTOM">Other Authority (अन्य लेख्नुहोस्)...</option>
                  </select>
                  {editApprovedByOption === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Type Authority Name..."
                      value={editCustomApprovedBy}
                      onChange={(e) => setEditCustomApprovedBy(e.target.value)}
                      className="erp-input"
                    />
                  )}
                </div>
              </div>

              {/* Particulars & Remarks */}
              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Description / Particulars (खर्चको विवरण)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Details of expense..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">Remarks (कैफियत)</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Any extra remarks..."
                  className="erp-input"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateExpenseMutation.isPending}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-60 shadow-xs"
                >
                  {updateExpenseMutation.isPending ? 'Updating...' : 'Update Expense (अपडेट गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. ADD NEW EXPENSE TOPIC WITH CODE MODAL ───────────────────────── */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Layers size={16} />
                <span>Add Expense Topic with Code (नयाँ खर्च शीर्षक)</span>
              </h3>
              <button onClick={() => setIsAddHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExpenseHeadMutation.mutate({
                  categoryId: categoriesData?.[0]?.id || 1,
                  code: newHeadCode.trim() || undefined,
                  name: newHeadName,
                  nameNepali: newHeadNameNepali,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Accounting Code (खर्च कोड न.)</label>
                <input
                  type="text"
                  placeholder="e.g. 20101, 20201, 30101"
                  value={newHeadCode}
                  onChange={(e) => setNewHeadCode(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Topic Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tour / Excursion, Stationery, Internet"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Title (नेपाली शीर्षक)</label>
                <input
                  type="text"
                  placeholder="भ्रमण, स्टेसनरी, इन्टरनेट"
                  value={newHeadNameNepali}
                  onChange={(e) => setNewHeadNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createExpenseHeadMutation.isPending} className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs">
                  {createExpenseHeadMutation.isPending ? 'Saving...' : 'Save Expense Topic (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 7. ADD NEW PARTY / RECIPIENT MODAL ──────────────────────────────── */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-1.5">
                <Users size={16} />
                <span>Add Recipient / Party (पाउने व्यक्ति/संस्था)</span>
              </h3>
              <button onClick={() => setIsAddPartyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalPartyType = newPartyType === 'CUSTOM' ? customPartyType : newPartyType;
                createPartyMutation.mutate({
                  name: newPartyName,
                  nameNepali: newPartyNameNepali,
                  partyType: finalPartyType || 'VENDOR',
                  panNo: newPartyPan,
                  phone: newPartyPhone,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Party / Vendor Name (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Stationers / Electrician Ram Kumar / Groceries Shop"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nepali Name (नेपाली नाम)</label>
                <input
                  type="text"
                  placeholder="क्वालिटी स्टेसनरी / राम इलेक्ट्रिसियन"
                  value={newPartyNameNepali}
                  onChange={(e) => setNewPartyNameNepali(e.target.value)}
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Party Type (प्रकार)</label>
                  <select
                    value={newPartyType}
                    onChange={(e) => setNewPartyType(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="VENDOR">VENDOR (विक्रेता / पसल)</option>
                    <option value="SUPPLIER">SUPPLIER (सामग्री सप्लायर)</option>
                    <option value="WORKER">WORKER (श्रमिक / कामदार / इलेक्ट्रिसियन / प्लम्बर)</option>
                    <option value="SHOPKEEPER">SHOPKEEPER (पसले / खाद्यान्न / किराना / स्टेसनरी)</option>
                    <option value="SERVICE_PROVIDER">SERVICE PROVIDER (सेवा प्रदायक - बिजुली / इन्टरनेट)</option>
                    <option value="CONTRACTOR">CONTRACTOR (ठेकेदार / निर्माण कार्य)</option>
                    <option value="DONOR">DONOR (चन्दादाता / दानवीर)</option>
                    <option value="GOVT">GOVT (सरकारी निकाय / पालिका)</option>
                    <option value="STAFF">STAFF / TEACHER (शिक्षक तथा कर्मचारी)</option>
                    <option value="CUSTOM">OTHER (अन्य नयाँ प्रकार लेख्नुहोस्)...</option>
                  </select>
                  {newPartyType === 'CUSTOM' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom party type (e.g. Electrician, Groceries...)"
                      value={customPartyType}
                      onChange={(e) => setCustomPartyType(e.target.value)}
                      className="erp-input mt-1 font-bold border-rose-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN / VAT No.</label>
                  <input
                    type="text"
                    placeholder="601234567"
                    value={newPartyPan}
                    onChange={(e) => setNewPartyPan(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  className="erp-input font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddPartyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={createPartyMutation.isPending} className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs">
                  {createPartyMutation.isPending ? 'Saving...' : 'Save Party (सेभ गर्नुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 8. PARTY-WISE VOUCHERS INSPECTOR MODAL ──────────────────────────── */}
      {inspectPartyId && partyVouchersData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                  <Building size={18} className="text-rose-600" />
                  <span>Party Ledger: {partyVouchersData.party?.name}</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  PAN: {partyVouchersData.party?.panNo || 'N/A'} • Phone: {partyVouchersData.party?.phone || 'N/A'} • Type: {partyVouchersData.party?.partyType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerFullPartyLedgerPrint(partyVouchersData)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a5280] px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
                >
                  <Printer size={13} />
                  <span>Print Full Party Ledger Report (लेखा पाना प्रिन्ट)</span>
                </button>
                <button onClick={() => setInspectPartyId(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Vouchers Paid</span>
                <p className="text-base font-extrabold text-[#1e3a5f]">{partyVouchersData.totalVoucherCount}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Expense Amount</span>
                <p className="text-base font-extrabold text-rose-700 font-mono">रू {(partyVouchersData.totalExpenseSum || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Net Party Ledger Balance</span>
                <p className="text-base font-extrabold text-emerald-700 font-mono">
                  रू {((partyVouchersData.totalExpenseSum || 0) - (partyVouchersData.totalIncomeSum || 0)).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-[#1e3a5f] uppercase tracking-wider text-[11px]">Expense Vouchers Issued to this Party</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-[#1e3a5f] text-white text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Date (BS)</th>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Expense Head</th>
                      <th className="py-2.5 px-3">Method & Cheque</th>
                      <th className="py-2.5 px-3 text-right">Amount (रू)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {partyVouchersData.expenses?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400">No expense vouchers recorded for this party yet.</td>
                      </tr>
                    ) : (
                      partyVouchersData.expenses?.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{e.expenseDateBs}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#1e3a5f]">{e.voucherNo || `VOUCH-${e.id}`}</td>
                          <td className="py-2 px-3 font-bold">{e.head?.name}</td>
                          <td className="py-2 px-3 font-mono">
                            {e.paymentMedium} {e.chequeNo ? `(Chk: ${e.chequeNo})` : ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                            रू ${(e.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => triggerSingleVoucherPrint({ ...e, party: partyVouchersData.party })}
                              className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-0.5 text-[10px] font-extrabold shadow-2xs transition"
                              title="Print Single Official Journal Voucher"
                            >
                              <Printer size={10} />
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

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectPartyId(null)}
                className="rounded-xl border border-gray-200 px-5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. EDIT PAYABLE BILL MODAL ─────────────────────────────────────── */}
      {editingPayableBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                    Edit Payable Bill Details (बिल तथा हिसाब सम्पादन)
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Bill No: <strong className="text-blue-900">{editingPayableBill.billNo}</strong> | Total Paid: Rs. {editingPayableBill.totalPaidAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingPayableBill(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayable} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill / Invoice No (बिल नं.) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editPayBillNo}
                    onChange={(e) => setEditPayBillNo(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Bill Date BS (मिति) *
                  </label>
                  <input
                    required
                    type="text"
                    value={editPayBillDateBs}
                    onChange={(e) => setEditPayBillDateBs(formatDateInput(e.target.value))}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Vendor / Party (पाउने व्यक्ति/संस्था)
                  </label>
                  <select
                    value={editPayBillPartyId}
                    onChange={(e) => setEditPayBillPartyId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Party / Vendor --</option>
                    {partiesData?.map((p: any) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name} {p.panNo ? `(PAN: ${p.panNo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-800 mb-1">
                    Expense Head / Topic (खर्च शीर्षक)
                  </label>
                  <select
                    value={editPayBillHeadId}
                    onChange={(e) => setEditPayBillHeadId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Expense Topic --</option>
                    {headsData?.map((h: any) => (
                      <option key={h.id} value={h.id.toString()}>
                        {h.code ? `[${h.code}] ` : ''}{h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Total Bill Amount in रू (कुल बिल रकम) *
                </label>
                <input
                  required
                  type="number"
                  step="any"
                  value={editPayBillTotalAmount}
                  onChange={(e) => setEditPayBillTotalAmount(e.target.value)}
                  className="erp-input font-mono font-extrabold text-purple-900"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Currently paid: <strong className="text-emerald-700 font-mono">Rs. {editingPayableBill.totalPaidAmount.toLocaleString()}</strong> |
                  Calculated Due: <strong className="text-rose-700 font-mono">Rs. {Math.max(0, (parseFloat(editPayBillTotalAmount || '0') - editingPayableBill.totalPaidAmount)).toLocaleString()}</strong>
                </p>
              </div>

              <div>
                <label className="block font-extrabold text-gray-800 mb-1">
                  Description / Particulars (विवरण)
                </label>
                <textarea
                  rows={2}
                  value={editPayBillDescription}
                  onChange={(e) => setEditPayBillDescription(e.target.value)}
                  placeholder="Purchase of furniture, stationery, or equipment..."
                  className="erp-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPayableBill(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel (रद्द)
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 font-bold text-white shadow-xs transition"
                >
                  Save Bill Changes (परिवर्तन सुरक्षित)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
