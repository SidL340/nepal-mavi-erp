'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, getFiscalYearFromBS } from '@/lib/nepali-date';
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
  Download,
  CreditCard,
  Layers,
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Send,
  Users,
  Settings,
  ShieldCheck,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Standard BS Months list
const NEPALI_MONTHS = [
  { id: '01', name: 'बैशाख (Baisakh)', nepali: 'बैशाख' },
  { id: '02', name: 'जेठ (Jestha)', nepali: 'जेठ' },
  { id: '03', name: 'असार (Ashadh)', nepali: 'असार' },
  { id: '04', name: 'साउन (Shrawan)', nepali: 'साउन' },
  { id: '05', name: 'भदौ (Bhadra)', nepali: 'भदौ' },
  { id: '06', name: 'असोज (Ashwin)', nepali: 'असोज' },
  { id: '07', name: 'कार्तिक (Kartik)', nepali: 'कार्तिक' },
  { id: '08', name: 'मंसिर (Mangsir)', nepali: 'मंसिर' },
  { id: '09', name: 'पुस (Poush)', nepali: 'पुस' },
  { id: '10', name: 'माघ (Magh)', nepali: 'माघ' },
  { id: '11', name: 'फागुन (Falgun)', nepali: 'फागुन' },
  { id: '12', name: 'चैत (Chaitra)', nepali: 'चैत' },
];

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bulk' | 'history' | 'scales'>('bulk');

  // Period / Year & Month Range State
  const currentBS = todayBS();
  const currentYear = currentBS.slice(0, 4) || '2083';
  const [selectedFYId, setSelectedFYId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [fromMonth, setFromMonth] = useState<string>('04'); // साउन
  const [toMonth, setToMonth] = useState<string>('06'); // असोज
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [filterType, setFilterType] = useState<string>(''); // RASTRIYA, NIJI_SROTH
  const [historyFYFilter, setHistoryFYFilter] = useState<string>('ALL');

  // Global Multipliers & Allowances Toggles
  const [globalFestivalAllowed, setGlobalFestivalAllowed] = useState<boolean>(false);
  const [globalDressAllowance, setGlobalDressAllowance] = useState<number>(0);
  const [globalDearnessAmount, setGlobalDearnessAmount] = useState<number>(2000);
  const [globalInsuranceGovContribution, setGlobalInsuranceGovContribution] = useState<number>(400);

  // Bulk Grid Items State: mapped by teacherId
  const [bulkRows, setBulkRows] = useState<Record<number, any>>({});
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [searchStaff, setSearchStaff] = useState<string>('');
  const [staffSortOrder, setStaffSortOrder] = useState<'hierarchy' | 'id' | 'name'>('hierarchy');

  // Official Nepal School Staff Hierarchy Rank Helper (मर्यादाक्रम)
  const getStaffRank = (t: any): number => {
    if (!t) return 99;
    const isPrincipal = Boolean(
      (
        t.inchargeRole === 'PRINCIPAL' ||
        t.post === 'प्रधानाध्यापक (Headmaster / Principal)' ||
        t.post === 'प्रधानाध्यापक' ||
        t.post?.toLowerCase() === 'principal' ||
        t.post?.toLowerCase() === 'headmaster'
      ) &&
      !t.post?.includes('सहायक') &&
      !t.post?.includes('Assistant') &&
      !t.inchargeRole?.includes('VICE')
    );
    if (isPrincipal) return 10;

    if (
      t.post?.includes('सहायक प्रधानाध्यापक') ||
      t.post?.toLowerCase().includes('assistant headmaster') ||
      t.post?.toLowerCase().includes('vice principal')
    ) {
      return 20;
    }

    const taha = (t.taha || '').toLowerCase();
    const post = (t.post || '').toLowerCase();
    const shreni = (t.shreni || '').toLowerCase();

    const isSecondary =
      taha.includes('माध्यमिक') ||
      taha.includes('मा.वि.') ||
      taha.includes('secondary') ||
      post.includes('मा.वि.') ||
      post.includes('माध्यमिक') ||
      post.includes('secondary');
    if (isSecondary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 31;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 32;
      return 33;
    }

    const isLowerSecondary =
      taha.includes('निम्न') ||
      taha.includes('नि.मा.वि.') ||
      taha.includes('lower secondary') ||
      post.includes('नि.मा.वि.') ||
      post.includes('निम्न माध्यमिक') ||
      post.includes('lower secondary');
    if (isLowerSecondary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 41;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 42;
      return 43;
    }

    const isPrimary =
      taha.includes('प्राथमिक') ||
      taha.includes('प्रा.वि.') ||
      taha.includes('primary') ||
      post.includes('प्रा.वि.') ||
      post.includes('प्राथमिक') ||
      post.includes('primary');
    if (isPrimary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 51;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 52;
      return 53;
    }

    const isEcd =
      taha.includes('बालविकास') ||
      taha.includes('ecd') ||
      taha.includes('पूर्व प्राथमिक') ||
      post.includes('बालविकास') ||
      post.includes('ecd') ||
      post.includes('nursery');
    if (isEcd) return 60;

    if (t.isTeachingStaff !== false && t.shreni !== 'NON_TEACHING') {
      return 70;
    }

    if (post.includes('लेखा') || post.includes('accountant')) return 81;
    if (post.includes('सहायक') || post.includes('assistant') || post.includes('प्रशासन') || post.includes('operator')) return 82;
    if (post.includes('सहयोगी') || post.includes('परिचर') || post.includes('helper') || post.includes('peon')) return 85;
    if (post.includes('पाले') || post.includes('guard') || post.includes('चालक') || post.includes('सफाइ')) return 86;

    return 90;
  };

  // Modals & Single Slips
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    bankAccountId: '',
    paymentDateBs: todayBS(),
    chequeNo: '',
    chequePayeeName: 'Teacher & Staff Salary Disbursement',
    voucherNo: '',
    paymentMedium: 'CHEQUE',
    remarks: '',
  });

  // Scale Modal
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<any>(null);
  const [scaleForm, setScaleForm] = useState({
    taha: 'माध्यमिक तह',
    shreni: 'तृतीय श्रेणी',
    moolTalab: 43689,
    gradeAmount: 1456,
  });

  // Single Edit Modal
  const [isSingleEditModalOpen, setIsSingleEditModalOpen] = useState(false);
  const [singleEditData, setSingleEditData] = useState<any>(null);

  // Past / Historical Staff State
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isAddPastStaffOpen, setIsAddPastStaffOpen] = useState(false);
  const [pastStaffForm, setPastStaffForm] = useState({
    fullName: '',
    fullNameNepali: '',
    gender: 'MALE',
    phone: '',
    panNo: '',
    shreni: 'TEACHING',
    taha: 'माध्यमिक तह',
    post: 'मा.वि. शिक्षक',
    type: 'RASTRIYA',
    dateOfJoiningBs: '',
    dateOfRetirementBs: '',
    statusReason: 'सरुवा (Transferred)',
  });

  // ── 1. Fetch Teachers (Faculty & Staff - including historical/past staff) ───
  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers-all-payroll'],
    queryFn: async () => {
      const res = await api.get('/teachers?includeInactive=true');
      return res.data?.data || [];
    },
  });

  // Add Past Staff Mutation
  const addPastStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/teachers', {
        ...payload,
        isActive: false,
        enableLogin: false,
        isHistorical: true,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('विगत/पूर्व शिक्षक कर्मचारी अभिलेख सुरक्षित भयो (Login Portal खाता बिना)');
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
      setIsAddPastStaffOpen(false);
      setPastStaffForm({
        fullName: '',
        fullNameNepali: '',
        gender: 'MALE',
        phone: '',
        panNo: '',
        shreni: 'TEACHING',
        taha: 'माध्यमिक तह',
        post: 'मा.वि. शिक्षक',
        type: 'RASTRIYA',
        dateOfJoiningBs: '',
        dateOfRetirementBs: '',
        statusReason: 'सरुवा (Transferred)',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add past staff');
    },
  });

  // ── 2. Fetch Salary Scales (Government Pay Scales) ──────────────────────
  const { data: scalesData, isLoading: isScalesLoading } = useQuery({
    queryKey: ['salary-scales-all'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/all');
      return res.data?.data || [];
    },
  });

  // ── 3. Fetch Financial Years ──────────────────────────────────────────
  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });
  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];

  // Resolve selected Financial Year
  const selectedFinancialYear = useMemo(() => {
    if (!financialYearsData || financialYearsData.length === 0) return activeFinancialYear;
    if (selectedFYId) {
      return financialYearsData.find((f: any) => f.id.toString() === selectedFYId) || activeFinancialYear;
    }
    return activeFinancialYear || financialYearsData[0];
  }, [financialYearsData, selectedFYId, activeFinancialYear]);

  // Sync FY selection on initial data load
  useEffect(() => {
    if (activeFinancialYear && !selectedFYId) {
      setSelectedFYId(activeFinancialYear.id.toString());
      const yrMatch = activeFinancialYear.year?.match(/(\d{4})/);
      if (yrMatch && yrMatch[1]) {
        setSelectedYear(yrMatch[1]);
      }
    }
  }, [activeFinancialYear, selectedFYId]);

  // ── 4. Fetch Bank Accounts for Bulk Payment ───────────────────────────
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts-all'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  // Auto-select first bank account when available
  useEffect(() => {
    if (bankAccountsData && bankAccountsData.length > 0 && !disburseForm.bankAccountId) {
      setDisburseForm((prev) => ({ ...prev, bankAccountId: bankAccountsData[0].id.toString() }));
    }
  }, [bankAccountsData, disburseForm.bankAccountId]);

  // ── 5. Fetch School Profile for Header & Prints ────────────────────────
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // ── 6. Fetch Payroll History ──────────────────────────────────────────
  const { data: payrollsData, isLoading: isPayrollsLoading } = useQuery({
    queryKey: ['payrolls-list'],
    queryFn: async () => {
      const res = await api.get('/payroll?limit=200');
      return res.data?.data || [];
    },
  });

  // Calculate Month Count
  const monthCount = useMemo(() => {
    const fromIdx = parseInt(fromMonth, 10);
    const toIdx = parseInt(toMonth, 10);
    if (toIdx >= fromIdx) return toIdx - fromIdx + 1;
    return 12 - fromIdx + toIdx + 1;
  }, [fromMonth, toMonth]);

  const monthFromStr = `${selectedYear}-${fromMonth}`;
  const monthToStr = `${selectedYear}-${toMonth}`;

  // ── 7. Initialize and prefill bulk spreadsheet rows when teachers/scales change ──
  useEffect(() => {
    if (!teachersData || teachersData.length === 0) return;

    const initialRows: Record<number, any> = {};
    const allIds: number[] = [];

    // Sort by official hierarchy rank order (Principal first, then Secondary, Lower Sec, Primary, Non-Teaching)
    const sortedTeachers = (teachersData || []).slice().sort((a: any, b: any) => {
      const rankA = getStaffRank(a);
      const rankB = getStaffRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.id - b.id;
    });

    sortedTeachers.forEach((teacher: any) => {
      allIds.push(teacher.id);

      // Match salary scale if available
      let matchedScale = scalesData?.find(
        (s: any) =>
          s.taha === teacher.taha &&
          (!teacher.shreni || s.shreni === teacher.shreni)
      );

      // Default fallback scales
      const baseSalary = matchedScale ? matchedScale.moolTalab : (teacher.shreni === 'NON_TEACHING' ? 26082 : 38000);
      const gradeRate = matchedScale ? matchedScale.gradeAmount : (teacher.shreni === 'NON_TEACHING' ? 869 : 1200);

      // Strictly Principal only for प्र.अ. भत्ता [I] (exclude assistant headmaster, vice principal, etc.)
      const isPrincipal = Boolean(
        (
          teacher.inchargeRole === 'PRINCIPAL' ||
          teacher.post === 'प्रधानाध्यापक (Headmaster / Principal)' ||
          teacher.post === 'प्रधानाध्यापक' ||
          teacher.post?.toLowerCase() === 'principal' ||
          teacher.post?.toLowerCase() === 'headmaster'
        ) &&
        !teacher.post?.includes('सहायक') &&
        !teacher.post?.includes('Assistant') &&
        !teacher.inchargeRole?.includes('VICE')
      );

      initialRows[teacher.id] = {
        teacherId: teacher.id,
        fullName: teacher.fullName,
        fullNameNepali: teacher.fullNameNepali || teacher.fullName,
        taha: teacher.taha || (teacher.shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'माध्यमिक तह'),
        shreni: teacher.shreni || (teacher.shreni === 'NON_TEACHING' ? 'श्रेणीविहीन' : 'तृतीय श्रेणी'),
        post: teacher.post || (teacher.shreni === 'NON_TEACHING' ? 'कर्मचारी' : 'शिक्षक'),
        type: teacher.type || 'RASTRIYA',
        bankAccountNo: teacher.bankAccountNo || '',
        panNo: teacher.panNo || '',
        // Form inputs
        moolTalab: baseSalary, // A
        gradeNo: 3, // B (Default 3 grades, easily editable)
        gradeAmount: gradeRate, // C
        bimaThap: globalInsuranceGovContribution, // G (Default 400)
        // Dedicated Allowance flags & values
        hasPraABhata: isPrincipal,
        praABhata: isPrincipal ? 1000 : 0, // I (प्र.अ. भत्ता strictly only for Principal)
        hasMahangiGhata: true,
        mahangiGhata: globalDearnessAmount, // J (Default 2000)
        hasDurgamBhata: false,
        durgamBhata: 0, // K
        hasProtsahanBhata: false,
        protsahanBhata: 0, // L
        hasOtherBhata: false,
        otherBhata: 0, // M
        karmachariKoshSapati: 0, // R (Loan)
        includeChaadparba: globalFestivalAllowed, // V
        poshakBhata: globalDressAllowance, // W
        remarks: '',
      };
    });

    setBulkRows(initialRows);
    setSelectedTeacherIds(allIds);
  }, [teachersData, scalesData]);

  // Update rows if global festival or dress allowance toggle changes
  const applyGlobalSettingsToRows = (festival: boolean, dress: number, dearness: number, insurance: number) => {
    setBulkRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        updated[id] = {
          ...updated[id],
          includeChaadparba: festival,
          poshakBhata: dress,
          mahangiGhata: dearness,
          bimaThap: insurance,
        };
      });
      return updated;
    });
  };

  // ── Calculation Helper (Columns A through Z) ──────────────────────────
  const calculateRow = (row: any) => {
    if (!row) return {};
    const A = parseFloat(row.moolTalab || 0); // मूल तलब
    const B = parseInt(row.gradeNo || 0, 10); // ग्रेड संख्या
    const C = parseFloat(row.gradeAmount || 0); // ग्रेड दर
    const D = +(B * C).toFixed(2); // जम्मा ग्रेड रकम (B * C)
    const E = +(A + D).toFixed(2); // जम्मा तलब (ग्रेड सहित) (A + D)
    const F = +(E * 0.10).toFixed(2); // क.सं. कोष थप १०% (10% of E)
    const G = parseFloat(row.bimaThap !== undefined ? row.bimaThap : 400); // बीमा थप
    const H = +(E + F + G).toFixed(2); // कुल तलब (E + F + G)

    // Allowances (only added if checkbox is checked or enabled)
    const isPraA = row.hasPraABhata !== undefined ? row.hasPraABhata : (parseFloat(row.praABhata || 0) > 0);
    const I = isPraA ? parseFloat(row.praABhata || 0) : 0; // प्र.अ. भत्ता

    const isMahangi = row.hasMahangiGhata !== undefined ? row.hasMahangiGhata : (row.mahangiGhata !== undefined ? parseFloat(row.mahangiGhata) > 0 : true);
    const J = isMahangi ? parseFloat(row.mahangiGhata !== undefined ? row.mahangiGhata : 2000) : 0; // महङ्गी भत्ता

    const isDurgam = row.hasDurgamBhata !== undefined ? row.hasDurgamBhata : (parseFloat(row.durgamBhata || 0) > 0);
    const K = isDurgam ? parseFloat(row.durgamBhata || 0) : 0; // दुर्गम भत्ता

    const isProtsahan = row.hasProtsahanBhata !== undefined ? row.hasProtsahanBhata : (parseFloat(row.protsahanBhata || 0) > 0);
    const L = isProtsahan ? parseFloat(row.protsahanBhata || 0) : 0; // प्रोत्साहन भत्ता

    const isOther = row.hasOtherBhata !== undefined ? row.hasOtherBhata : (parseFloat(row.otherBhata || 0) > 0);
    const M = isOther ? parseFloat(row.otherBhata || 0) : 0; // अन्य भत्ता

    const N = +(I + J + K + L + M).toFixed(2); // जम्मा भत्ता

    const O = +(H + N).toFixed(2); // जम्मा तलब भत्ता (H + N)
    const P = +(O * monthCount).toFixed(2); // त्रैमासिक तलब भत्ता (O * monthCount)

    // विभिन्न कट्टी (Deductions)
    const Q = +(E * 0.20 * monthCount).toFixed(2); // क.सं. कोष २०% कट्टी ((20% of E) * monthCount)
    const R = parseFloat(row.karmachariKoshSapati || 0); // कोष सापट कट्टी
    const S = +(G * 2 * monthCount).toFixed(2); // बीमा कट्टी ((G * 2) * monthCount)
    const T = +(Q + R + S).toFixed(2); // जम्मा कट्टी (Q + R + S)

    const U = +(P - T).toFixed(2); // बाँकी पाउनु पर्ने (P - T)

    const V = row.includeChaadparba ? E : 0; // चाडपर्व खर्च (E)
    const W = parseFloat(row.poshakBhata || 0); // पोसाक भत्ता
    const X = +(U + V + W).toFixed(2); // जम्मा पाउनु पर्ने (U + V + W)

    const Y = +(X * 0.01).toFixed(2); // सा.सु. कर १% कट्टी (1% of X)
    const Z = +(X - Y).toFixed(2); // खुद भुक्तानी पाउनु पर्ने (X - Y)

    return {
      A, B, C, D, E, F, G, H,
      I, J, K, L, M, N,
      O, P,
      Q, R, S, T,
      U, V, W, X, Y, Z,
    };
  };

  // Update specific field in row
  const handleFieldChange = (teacherId: number, field: string, value: any) => {
    setBulkRows((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [field]: value,
      },
    }));
  };

  // Handle Scale Change for Teacher
  const handleScaleSelection = (teacherId: number, scaleId: string) => {
    const scale = scalesData?.find((s: any) => s.id.toString() === scaleId);
    if (!scale) return;
    setBulkRows((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        taha: scale.taha,
        shreni: scale.shreni,
        moolTalab: scale.moolTalab,
        gradeAmount: scale.gradeAmount,
      },
    }));
  };

  // Filtered displayed staff (including active vs past/transferred, sorted by hierarchy/ID)
  const displayedStaff = useMemo(() => {
    const list = (teachersData || []).filter((t: any) => {
      if (staffStatusFilter === 'ACTIVE' && t.isActive === false) return false;
      if (staffStatusFilter === 'INACTIVE' && t.isActive !== false) return false;
      if (selectedCategory === 'TEACHING' && t.shreni === 'NON_TEACHING') return false;
      if (selectedCategory === 'NON_TEACHING' && t.shreni !== 'NON_TEACHING') return false;
      if (filterType && t.type !== filterType) return false;
      if (searchStaff) {
        const q = searchStaff.toLowerCase();
        return (
          t.fullName?.toLowerCase().includes(q) ||
          t.fullNameNepali?.toLowerCase().includes(q) ||
          t.taha?.toLowerCase().includes(q) ||
          t.post?.toLowerCase().includes(q) ||
          t.panNo?.includes(q)
        );
      }
      return true;
    });

    return list.slice().sort((a: any, b: any) => {
      if (staffSortOrder === 'hierarchy') {
        const rankA = getStaffRank(a);
        const rankB = getStaffRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.id - b.id;
      }
      if (staffSortOrder === 'id') {
        return a.id - b.id;
      }
      if (staffSortOrder === 'name') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      return a.id - b.id;
    });
  }, [teachersData, staffStatusFilter, selectedCategory, filterType, searchStaff, staffSortOrder]);

  // Grand Totals of selected staff
  const grandTotals = useMemo(() => {
    let totalGrossP = 0;
    let totalDeductionT = 0;
    let totalFestivalV = 0;
    let totalDressW = 0;
    let totalTaxY = 0;
    let totalNetZ = 0;
    let count = 0;

    selectedTeacherIds.forEach((id) => {
      const row = bulkRows[id];
      if (!row) return;
      const calc = calculateRow(row);
      totalGrossP += calc.P || 0;
      totalDeductionT += calc.T || 0;
      totalFestivalV += calc.V || 0;
      totalDressW += calc.W || 0;
      totalTaxY += calc.Y || 0;
      totalNetZ += calc.Z || 0;
      count++;
    });

    return {
      count,
      totalGrossP: Math.round(totalGrossP * 100) / 100,
      totalDeductionT: Math.round(totalDeductionT * 100) / 100,
      totalFestivalV: Math.round(totalFestivalV * 100) / 100,
      totalDressW: Math.round(totalDressW * 100) / 100,
      totalTaxY: Math.round(totalTaxY * 100) / 100,
      totalNetZ: Math.round(totalNetZ * 100) / 100,
    };
  }, [selectedTeacherIds, bulkRows, monthCount]);

  // ── 8. Bulk Save Mutation ─────────────────────────────────────────────
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      if (selectedTeacherIds.length === 0) {
        throw new Error('कृपया कम्तीमा १ जना शिक्षक/कर्मचारी छनौट गर्नुहोस्!');
      }

      const items = selectedTeacherIds.map((id) => {
        const row = bulkRows[id];
        return {
          teacherId: id,
          monthFrom: monthFromStr,
          monthTo: monthToStr,
          taha: row.taha,
          shreni: row.shreni,
          moolTalab: row.moolTalab,
          gradeNo: row.gradeNo,
          gradeAmount: row.gradeAmount,
          mahangiGhata: row.mahangiGhata,
          praABhata: row.praABhata,
          durgamBhata: row.durgamBhata,
          protsahanBhata: row.protsahanBhata,
          otherBhata: row.otherBhata,
          karmachariKoshSapati: row.karmachariKoshSapati,
          bimaThap: row.bimaThap,
          includeChaadparba: row.includeChaadparba,
          poshakBhata: row.poshakBhata,
          remarks: row.remarks,
        };
      });

      const res = await api.post('/payroll/bulk-save', {
        items,
        monthFrom: monthFromStr,
        monthTo: monthToStr,
        monthCount,
        financialYearId: selectedFinancialYear?.id || activeFinancialYear?.id,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'सफलतापूर्वक तलब भरपाई दर्ता गरियो!');
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'भरपाई दर्ता गर्न सकिएन');
    },
  });

  // ── 9. Issue Bulk Payment & Expense Posting ────────────────────────────
  const issueBulkPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!disburseForm.bankAccountId) {
        throw new Error('कृपया विद्यालयको बैंक खाता छनौट गर्नुहोस्!');
      }

      // First ensure the latest records are saved
      const items = selectedTeacherIds.map((id) => {
        const row = bulkRows[id];
        return {
          teacherId: id,
          monthFrom: monthFromStr,
          monthTo: monthToStr,
          taha: row.taha,
          shreni: row.shreni,
          moolTalab: row.moolTalab,
          gradeNo: row.gradeNo,
          gradeAmount: row.gradeAmount,
          mahangiGhata: row.mahangiGhata,
          praABhata: row.praABhata,
          durgamBhata: row.durgamBhata,
          protsahanBhata: row.protsahanBhata,
          otherBhata: row.otherBhata,
          karmachariKoshSapati: row.karmachariKoshSapati,
          bimaThap: row.bimaThap,
          includeChaadparba: row.includeChaadparba,
          poshakBhata: row.poshakBhata,
          remarks: row.remarks,
        };
      });

      const saveRes = await api.post('/payroll/bulk-save', {
        items,
        monthFrom: monthFromStr,
        monthTo: monthToStr,
        monthCount,
        financialYearId: selectedFinancialYear?.id || activeFinancialYear?.id,
      });

      const savedPayrolls = saveRes.data?.data || [];
      const payrollIds = savedPayrolls.map((p: any) => p.id);

      // Now disburse via bank and post expense
      const disburseRes = await api.post('/payroll/disburse-bank-bulk', {
        payrollIds,
        bankAccountId: disburseForm.bankAccountId,
        paymentDateBs: disburseForm.paymentDateBs || todayBS(),
        chequeNo: disburseForm.chequeNo,
        chequePayeeName: disburseForm.chequePayeeName,
        voucherNo: disburseForm.voucherNo,
        remarks: disburseForm.remarks,
      });

      return disburseRes.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'एकमुष्ट बैंक तलब भुक्तानी निकासा र खर्च प्रविष्टि सम्पन्न भयो!');
      setIsDisburseModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'बैंक भुक्तानी निकासा गर्न सकिएन');
    },
  });

  // ── 10. Seed Default Salary Scales ─────────────────────────────────────
  const seedScalesMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/payroll/salary-scales/seed-default');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'नेपाल सरकार शिक्षक तलब स्केल सुरक्षित गरियो!');
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to seed scales');
    },
  });

  // ── 11. Delete Scale Mutation ──────────────────────────────────────────
  const deleteScaleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/payroll/salary-scales/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Salary scale deleted');
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
  });

  // ── 12. Save Scale Mutation ────────────────────────────────────────────
  const saveScaleMutation = useMutation({
    mutationFn: async () => {
      if (editingScale) {
        const res = await api.put(`/payroll/salary-scales/${editingScale.id}`, scaleForm);
        return res.data;
      } else {
        const res = await api.post('/payroll/salary-scales', scaleForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingScale ? 'Scale updated' : 'New scale created');
      setIsScaleModalOpen(false);
      setEditingScale(null);
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save scale');
    },
  });

  // ── 13. Official Nepal Government Bharpai Sheet Print ──────────────────
  const triggerOfficialGoNBharpaiPrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNe = schoolProfile?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय';
    const subNe = schoolProfile?.address || 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट';
    const estdNe = schoolProfile?.estYear ? `(स्था: ${schoolProfile.estYear})` : '(स्था: २००७)';
    const fyYear = activeFinancialYear?.year || getFiscalYearFromBS(todayBS());

    const selectedList = selectedTeacherIds
      .map((id) => {
        const row = bulkRows[id];
        if (!row) return null;
        const teacherObj = teachersData?.find((t: any) => t.id === id) || row;
        const calc = calculateRow(row);
        return { ...row, teacherObj, calc };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (staffSortOrder === 'hierarchy') {
          const rankA = getStaffRank(a.teacherObj || a);
          const rankB = getStaffRank(b.teacherObj || b);
          if (rankA !== rankB) return rankA - rankB;
          return (a.teacherId || a.id) - (b.teacherId || b.id);
        }
        if (staffSortOrder === 'id') {
          return (a.teacherId || a.id) - (b.teacherId || b.id);
        }
        if (staffSortOrder === 'name') {
          return (a.fullName || '').localeCompare(b.fullName || '');
        }
        return (a.teacherId || a.id) - (b.teacherId || b.id);
      });

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>नेपाल सरकार तलब तथा भत्ता भरपाई - ${schoolNe}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: "Noto Sans Devanagari", "Kalimati", Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: #000; 
              font-size: 10px; 
              line-height: 1.25;
            }
            .header-box { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; }
            .school-title { font-size: 18px; font-weight: 900; margin: 0; color: #0b1f3a; }
            .school-sub { font-size: 11px; font-weight: bold; margin: 2px 0; }
            .doc-title { font-size: 13px; font-weight: 900; margin: 4px 0 2px 0; text-decoration: underline; }
            .meta-row { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.8px; }
            th, td { border: 1px solid #333; padding: 3px 2px; text-align: center; }
            th { background: #f1f5f9; font-weight: 900; }
            .text-left { text-align: left; padding-left: 4px; }
            .text-right { text-align: right; padding-right: 4px; font-family: monospace; }
            .bold { font-weight: 900; }
            .grand-total-row { background: #e2e8f0; font-weight: 900; }
            .footer-signatures { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; }
            .sig-block { width: 220px; text-align: center; border-top: 1px dashed #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1 class="school-title">${schoolNe}</h1>
            <div class="school-sub">${subNe} ${estdNe}</div>
            <div class="doc-title">शिक्षक तथा कर्मचारीहरूको तलब तथा भत्ता भरपाई (GOVERNMENT PAYROLL REGISTER)</div>
            <div class="meta-row">
              <div>आर्थिक वर्ष: <strong>${fyYear}</strong></div>
              <div>अवधि (Period): <strong>${monthFromStr} देखि ${monthToStr} सम्म (${monthCount} महिना)</strong></div>
              <div>कुल संख्या: <strong>${selectedList.length} जना</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2">क्र.सं.</th>
                <th rowspan="2" style="min-width: 100px;">कर्मचारीको नाम</th>
                <th rowspan="2">तह/दर्जा</th>
                <th rowspan="2">मूल तलब<br/>[A]</th>
                <th colspan="3">ग्रेड (Grade)</th>
                <th rowspan="2">जम्मा तलब<br/>(ग्रेड सहित)<br/>[E=A+D]</th>
                <th rowspan="2">क.सं. कोष<br/>थप १०%<br/>[F]</th>
                <th rowspan="2">बीमा<br/>थप<br/>[G]</th>
                <th rowspan="2">कुल तलब<br/>[H=E+F+G]</th>
                <th colspan="5">भत्ताहरू (Allowances)</th>
                <th rowspan="2">जम्मा<br/>भत्ता<br/>[N]</th>
                <th rowspan="2">जम्मा तलब<br/>भत्ता<br/>[O=H+N]</th>
                <th rowspan="2">त्रैमासिक<br/>तलब भत्ता<br/>[P=O×${monthCount}]</th>
                <th colspan="3">विभिन्न कट्टी (Deductions)</th>
                <th rowspan="2">जम्मा<br/>कट्टी<br/>[T=Q+R+S]</th>
                <th rowspan="2">बाँकी पाउनु<br/>पर्ने<br/>[U=P-T]</th>
                <th rowspan="2">चाडपर्व<br/>खर्च<br/>[V=E]</th>
                <th rowspan="2">पोसाक<br/>भत्ता<br/>[W]</th>
                <th rowspan="2">जम्मा<br/>[X=U+V+W]</th>
                <th rowspan="2">सा.सु. कर<br/>१% कट्टी<br/>[Y=1%]</th>
                <th rowspan="2">खुद भुक्तानी<br/>[Z=X-Y]</th>
                <th rowspan="2" style="min-width: 65px;">दस्तखत<br/>(Signature)</th>
              </tr>
              <tr>
                <th>संख्या<br/>[B]</th>
                <th>दर<br/>[C]</th>
                <th>रकम<br/>[D=B×C]</th>
                <th>प्र.अ.<br/>[I]</th>
                <th>महङ्गी<br/>[J]</th>
                <th>दुर्गम<br/>[K]</th>
                <th>प्रोत्साहन<br/>[L]</th>
                <th>अन्य<br/>[M]</th>
                <th>क.सं. कोष २०%<br/>[Q]</th>
                <th>सापट<br/>[R]</th>
                <th>बीमा<br/>[S]</th>
              </tr>
            </thead>
            <tbody>
              ${selectedList.map((item: any, idx: number) => {
                const c = item.calc;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="text-left bold">${item.fullNameNepali || item.fullName}</td>
                    <td>${item.taha || item.post}</td>
                    <td class="text-right">${c.A?.toLocaleString()}</td>
                    <td>${c.B}</td>
                    <td class="text-right">${c.C?.toLocaleString()}</td>
                    <td class="text-right">${c.D?.toLocaleString()}</td>
                    <td class="text-right bold">${c.E?.toLocaleString()}</td>
                    <td class="text-right">${c.F?.toLocaleString()}</td>
                    <td class="text-right">${c.G?.toLocaleString()}</td>
                    <td class="text-right bold">${c.H?.toLocaleString()}</td>
                    <td class="text-right">${c.I ? c.I.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.J ? c.J.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.K ? c.K.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.L ? c.L.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.M ? c.M.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${c.N?.toLocaleString()}</td>
                    <td class="text-right bold">${c.O?.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #0b1f3a;">${c.P?.toLocaleString()}</td>
                    <td class="text-right">${c.Q?.toLocaleString()}</td>
                    <td class="text-right">${c.R ? c.R.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.S?.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #991b1b;">${c.T?.toLocaleString()}</td>
                    <td class="text-right bold">${c.U?.toLocaleString()}</td>
                    <td class="text-right">${c.V ? c.V.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.W ? c.W.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${c.X?.toLocaleString()}</td>
                    <td class="text-right">${c.Y?.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #065f46; font-size: 9.5px;">${c.Z?.toLocaleString()}</td>
                    <td></td>
                  </tr>
                `;
              }).join('')}

              <tr class="grand-total-row">
                <td colspan="3" class="text-left bold">कुल जम्मा (GRAND TOTAL):</td>
                <td colspan="15"></td>
                <td class="text-right bold">रू ${grandTotals.totalGrossP.toLocaleString()}</td>
                <td colspan="3"></td>
                <td class="text-right bold">रू ${grandTotals.totalDeductionT.toLocaleString()}</td>
                <td></td>
                <td class="text-right bold">रू ${grandTotals.totalFestivalV.toLocaleString()}</td>
                <td class="text-right bold">रू ${grandTotals.totalDressW.toLocaleString()}</td>
                <td></td>
                <td class="text-right bold">रू ${grandTotals.totalTaxY.toLocaleString()}</td>
                <td class="text-right bold" style="font-size: 10px; color: #065f46;">रू ${grandTotals.totalNetZ.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sig-block">
              तयार गर्ने (लेखापाल / कर्मचारी)<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              जाँच गर्ने (प्रशासन / विद्यालय व्यवस्थापन समिति)<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              स्वीकृत गर्ने (प्रधानाध्यापक)<br/>
              नाम: ${schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत'}
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

  // Export to CSV helper
  const exportToCsv = () => {
    const headers = [
      'S.N.', 'Teacher Name', 'Taha/Post', 'Basic Salary (A)', 'Grade No (B)', 'Grade Rate (C)',
      'Grade Amount (D)', 'Gross Basic (E)', 'SSK 10% (F)', 'Insurance (G)', 'Gross Total (H)',
      'Total Allowances (N)', 'Monthly Total (O)', `Period Gross (P ${monthCount}M)`, 'SSK 20% (Q)',
      'Loan (R)', 'Insurance Ded (S)', 'Total Ded (T)', 'Net Salary (U)', 'Festival (V)', 'Dress (W)',
      'Total Gross (X)', 'Social Tax 1% (Y)', 'Net Payable (Z)', 'Bank Account',
    ];

    const rows = selectedTeacherIds.map((id, idx) => {
      const row = bulkRows[id];
      const c = calculateRow(row);
      return [
        idx + 1,
        `"${row.fullName}"`,
        `"${row.taha || row.post}"`,
        c.A, c.B, c.C, c.D, c.E, c.F, c.G, c.H,
        c.N, c.O, c.P, c.Q, c.R, c.S, c.T, c.U, c.V, c.W, c.X, c.Y, c.Z,
        `"${row.bankAccountNo || 'N/A'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Payroll_${selectedYear}_${fromMonth}_to_${toMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Wallet className="text-[#1e3a5f]" />
            <span>Government Teacher & Staff Payroll (शिक्षक तथा कर्मचारी तलब निकासा)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकारको आधिकारिक नियमानुसार: ग्रेड, भत्ता, १०% क.सं. कोष थप, बीमा, २०% कट्टी, १% सा.सु. कर र खुद बैंक भुक्तानी
          </p>
        </div>

        {/* Top 3 Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bulk' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Calculator size={14} />
            <span>Bulk Payroll Sheet (एकमुष्ट भरपाई)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Payroll History (निकासा इतिहास)</span>
          </button>
          <button
            onClick={() => setActiveTab('scales')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'scales' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Settings size={14} />
            <span>Salary Scales & Grades (तलब स्केल)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: BULK DATA ENTRY & BHARPAI ════════════════════ */}
      {activeTab === 'bulk' && (
        <div className="space-y-4">
          {/* Step 1: Period & Global Controls Strip */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              {/* Year & Month Selectors */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-gray-800">
                {/* 1. Fiscal Year (आर्थिक वर्ष) */}
                <div className="flex items-center gap-1.5 bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
                  <Calendar size={15} className="text-[#1e3a5f]" />
                  <span className="text-[#1e3a5f]">आर्थिक वर्ष:</span>
                  <select
                    value={selectedFYId || activeFinancialYear?.id?.toString() || ''}
                    onChange={(e) => {
                      const fyId = e.target.value;
                      setSelectedFYId(fyId);
                      const fy = financialYearsData?.find((f: any) => f.id.toString() === fyId);
                      if (fy) {
                        const yrMatch = fy.year?.match(/(\d{4})/);
                        if (yrMatch && yrMatch[1]) {
                          setSelectedYear(yrMatch[1]);
                        }
                      }
                    }}
                    className="bg-transparent font-extrabold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                  >
                    {financialYearsData && financialYearsData.length > 0 ? (
                      financialYearsData.map((fy: any) => (
                        <option key={fy.id} value={fy.id.toString()} className="text-gray-900 font-bold">
                          {fy.year?.includes('२०') || fy.year?.includes('20') ? `आ.व. ${fy.year}` : `आ.व. ${fy.year}`} {fy.isActive ? '(चालु / Active)' : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="2083" className="text-gray-900">२०८३/०८४ (2083/84)</option>
                        <option value="2082" className="text-gray-900">२०८२/०८३ (2082/83)</option>
                        <option value="2081" className="text-gray-900">२०८१/०८२ (2081/82)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 2. Exact Year (वर्ष) */}
                <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-gray-200">
                  <span className="text-gray-700">वर्ष (Year):</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {['2085', '2084', '2083', '2082', '2081', '2080', '2079', '2078'].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} BS
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Nepali Month Range */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
                  <span>कुन महिना देखि:</span>
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <span>सम्म:</span>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded-md font-mono text-[11px] shadow-2xs">
                    {monthCount} महिना ({monthCount === 3 ? 'त्रैमासिक निकासा' : monthCount === 1 ? 'मासिक निकासा' : `${monthCount} महिना`})
                  </span>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={triggerOfficialGoNBharpaiPrint}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>प्रिन्ट भरपाई पाना (Print Sheet)</span>
                </button>

                <button
                  type="button"
                  onClick={exportToCsv}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 border border-gray-300 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>Excel/CSV</span>
                </button>

                <button
                  type="button"
                  disabled={bulkSaveMutation.isPending}
                  onClick={() => bulkSaveMutation.mutate()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{bulkSaveMutation.isPending ? 'Saving...' : 'Save Payroll Draft (सुरक्षित गर्नुहोस्)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>एकमुष्ट बैंक भुक्तानी (Disburse via Bank)</span>
                </button>
              </div>
            </div>

            {/* Global Allowance Toggles Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 font-bold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalFestivalAllowed}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setGlobalFestivalAllowed(val);
                      applyGlobalSettingsToRows(val, globalDressAllowance, globalDearnessAmount, globalInsuranceGovContribution);
                    }}
                    className="rounded text-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <span>🎁 चाडपर्व खर्च समावेश (Dashain Allowance = 1 Month E)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-600">👔 पोसाक भत्ता (Dress):</span>
                  <input
                    type="number"
                    value={globalDressAllowance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGlobalDressAllowance(val);
                      applyGlobalSettingsToRows(globalFestivalAllowed, val, globalDearnessAmount, globalInsuranceGovContribution);
                    }}
                    className="w-20 px-2 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                    placeholder="रू ०"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-600">महङ्गी भत्ता दर (Dearness):</span>
                  <input
                    type="number"
                    value={globalDearnessAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGlobalDearnessAmount(val);
                      applyGlobalSettingsToRows(globalFestivalAllowed, globalDressAllowance, val, globalInsuranceGovContribution);
                    }}
                    className="w-20 px-2 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                  />
                </div>
              </div>

              <span className="text-[11px] text-gray-500 font-medium">
                * १०% संचय कोष थप [F], २०% संचय कोष कट्टी [Q], बीमा [G & S] र १% कर [Y] स्वतः हिसाब हुन्छ।
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pills */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'ALL' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Category ({teachersData?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCategory('TEACHING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Teaching Faculty (शिक्षक)
                </button>
                <button
                  onClick={() => setSelectedCategory('NON_TEACHING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'NON_TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Non-Teaching (कर्मचारी)
                </button>
              </div>

              {/* Staff Status Filter Pills (Active vs Past / Transferred) */}
              <div className="inline-flex rounded-xl bg-amber-50/80 p-1 border border-amber-200">
                <button
                  onClick={() => setStaffStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'ALL' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-100/60'
                  }`}
                >
                  सबै ({teachersData?.length || 0})
                </button>
                <button
                  onClick={() => setStaffStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-900 hover:bg-emerald-100/60'
                  }`}
                >
                  कार्यरत / Active ({teachersData?.filter((t: any) => t.isActive !== false).length || 0})
                </button>
                <button
                  onClick={() => setStaffStatusFilter('INACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'INACTIVE' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-900 hover:bg-rose-100/60'
                  }`}
                >
                  विगत/सरुवा / Past Staff ({teachersData?.filter((t: any) => t.isActive === false).length || 0})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* + Add Past / Historical Staff Button */}
              <button
                type="button"
                onClick={() => setIsAddPastStaffOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus size={14} />
                <span>+ पूर्व/विगत शिक्षक थप्नुहोस् (Past Staff)</span>
              </button>

              <div className="relative flex-1 min-w-[140px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, post, PAN..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
              {/* Order / Ranking Selector */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-gray-500">क्रम:</span>
                <select
                  value={staffSortOrder}
                  onChange={(e: any) => setStaffSortOrder(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                  title="शिक्षक तथा कर्मचारीहरूको क्रम छनोट गर्नुहोस्"
                >
                  <option value="hierarchy">👑 पद/तहगत मर्यादाक्रम (Official Hierarchy)</option>
                  <option value="id">🔢 दर्ता क्र.सं. (Staff ID Order)</option>
                  <option value="name">🔤 नाम वर्णानुक्रम (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-700 shrink-0">
                <input
                  type="checkbox"
                  id="selectAllStaff"
                  checked={selectedTeacherIds.length === displayedStaff.length && displayedStaff.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTeacherIds(displayedStaff.map((t: any) => t.id));
                    } else {
                      setSelectedTeacherIds([]);
                    }
                  }}
                  className="rounded text-[#1e3a5f] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="selectAllStaff" className="cursor-pointer">सबै ({selectedTeacherIds.length})</label>
              </div>
            </div>
          </div>

          {/* ════════════ SPREADSHEET TABLE GRID (A to Z) ════════════ */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200 relative border-collapse">
                <thead className="bg-[#1e3a5f] text-white text-[10.5px] font-extrabold uppercase tracking-tight sticky top-0 z-20 shadow-md">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-8">
                      <Check size={12} className="mx-auto" />
                    </th>
                    <th className="py-2.5 px-2 text-center w-8">क्र.सं.</th>
                    <th className="py-2.5 px-3 min-w-[160px]">कर्मचारीको नाम</th>
                    <th className="py-2.5 px-2 min-w-[120px]">तह / स्केल</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-blue-900/60">मूल तलब<br/>[A]</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-center">ग्रेड संख्या<br/>[B]</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">ग्रेड दर<br/>[C]</th>
                    <th className="py-2.5 px-2 min-w-[80px] text-right bg-blue-950/70">जम्मा ग्रेड<br/>[D=B×C]</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-blue-900">जम्मा तलब<br/>[E=A+D]</th>
                    <th className="py-2.5 px-2 min-w-[80px] text-right">क.सं. कोष १०%<br/>[F]</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-right">बीमा थप<br/>[G]</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-indigo-950">कुल तलब<br/>[H=E+F+G]</th>
                    {/* Allowances I, J, K, L, M */}
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-950/90">प्र.अ. भत्ता<br/>[I]</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-950/90">महङ्गी भत्ता<br/>[J]</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">दुर्गम भत्ता<br/>[K]</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">प्रोत्साहन<br/>[L]</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">अन्य भत्ता<br/>[M]</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-900 font-black">जम्मा भत्ता<br/>[N=I+J+K+L+M]</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-purple-950">मासिक जम्मा<br/>[O=H+N]</th>
                    <th className="py-2.5 px-2 min-w-[105px] text-right bg-slate-900 text-amber-300">
                      {monthCount}M तलब भत्ता<br/>[P=O×{monthCount}]
                    </th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-rose-950">कोष २०% कट्टी<br/>[Q]</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-rose-950/70">सापट कट्टी<br/>[R]</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right bg-rose-950/70">बीमा कट्टी<br/>[S]</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-rose-900 text-white">जम्मा कट्टी<br/>[T=Q+R+S]</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-blue-950">बाँकी पाउनु<br/>[U=P-T]</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right">चाडपर्व<br/>[V=E]</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">पोसाक<br/>[W]</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-emerald-950">जम्मा रकम<br/>[X=U+V+W]</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right">सा.सु. कर १%<br/>[Y]</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right bg-emerald-700 text-white font-black">
                      खुद भुक्तानी<br/>[Z=X-Y]
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isTeachersLoading ? (
                    <tr>
                      <td colSpan={30} className="p-12 text-center text-gray-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                        <p className="mt-2 text-xs">Loading payroll sheet data...</p>
                      </td>
                    </tr>
                  ) : displayedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={30} className="p-12 text-center text-gray-400">
                        No teachers or staff found.
                      </td>
                    </tr>
                  ) : (
                    displayedStaff.map((teacher: any, idx: number) => {
                      const row = bulkRows[teacher.id] || {};
                      const isSelected = selectedTeacherIds.includes(teacher.id);
                      const calc = calculateRow(row);

                      return (
                        <tr
                          key={teacher.id}
                          className={`transition ${isSelected ? 'bg-white hover:bg-blue-50/50' : 'bg-slate-50/70 opacity-60'}`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeacherIds((prev) => [...prev, teacher.id]);
                                } else {
                                  setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacher.id));
                                }
                              }}
                              className="rounded text-[#1e3a5f] w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>

                          {/* S.N. */}
                          <td className="py-2 px-2 text-center font-mono text-gray-500 font-bold text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Name & Title */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 text-xs truncate max-w-[150px]">
                                {teacher.fullName}
                              </span>
                              {!teacher.isActive && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded">
                                  विगत / सरुवा
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-nepali truncate max-w-[150px]">
                              {teacher.fullNameNepali || teacher.post || 'शिक्षक'}
                            </div>
                          </td>

                          {/* Taha / Scale Preset Dropdown */}
                          <td className="py-2 px-2">
                            <select
                              value={scalesData?.find((s: any) => s.taha === row.taha && s.shreni === row.shreni)?.id || ''}
                              onChange={(e) => handleScaleSelection(teacher.id, e.target.value)}
                              className="w-full text-[10px] font-semibold bg-slate-50 border border-gray-200 rounded p-1 focus:bg-white truncate"
                            >
                              <option value="">{row.taha || 'स्केल छनौट'}</option>
                              {scalesData?.map((sc: any) => (
                                <option key={sc.id} value={sc.id}>
                                  {sc.taha} - {sc.shreni} (रु {sc.moolTalab?.toLocaleString()})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* [A] मूल तलब */}
                          <td className="py-2 px-2 text-right font-mono bg-blue-50/40">
                            <input
                              type="number"
                              value={row.moolTalab || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'moolTalab', parseFloat(e.target.value) || 0)}
                              className="w-20 text-right font-mono font-bold text-xs bg-transparent border-b border-gray-300 focus:border-blue-600 focus:outline-hidden"
                            />
                          </td>

                          {/* [B] ग्रेड संख्या */}
                          <td className="py-2 px-2 text-center font-mono">
                            <input
                              type="number"
                              min="0"
                              max="12"
                              value={row.gradeNo || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'gradeNo', parseInt(e.target.value, 10) || 0)}
                              className="w-12 text-center font-mono font-bold text-xs bg-slate-50 border border-gray-300 rounded p-0.5 focus:bg-white"
                            />
                          </td>

                          {/* [C] ग्रेड दर */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.gradeAmount || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'gradeAmount', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [D] जम्मा ग्रेड रकम */}
                          <td className="py-2 px-2 text-right font-mono font-semibold text-gray-700 bg-slate-50">
                            {calc.D?.toLocaleString()}
                          </td>

                          {/* [E] जम्मा तलब (A + D) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-blue-950 bg-blue-50/70">
                            {calc.E?.toLocaleString()}
                          </td>

                          {/* [F] क.सं. कोष थप १०% */}
                          <td className="py-2 px-2 text-right font-mono text-gray-600">
                            {calc.F?.toLocaleString()}
                          </td>

                          {/* [G] बीमा थप */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.bimaThap || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'bimaThap', parseFloat(e.target.value) || 0)}
                              className="w-14 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [H] कुल तलब (E + F + G) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/50">
                            {calc.H?.toLocaleString()}
                          </td>

                          {/* [I] प्र.अ. भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasPraABhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasPraABhata', checked);
                                  if (checked && (!row.praABhata || row.praABhata === 0)) {
                                    handleFieldChange(teacher.id, 'praABhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="प्र.अ. भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasPraABhata}
                                value={row.hasPraABhata ? (row.praABhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'praABhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasPraABhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [J] महङ्गी भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasMahangiGhata !== false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasMahangiGhata', checked);
                                  if (checked && (!row.mahangiGhata || row.mahangiGhata === 0)) {
                                    handleFieldChange(teacher.id, 'mahangiGhata', globalDearnessAmount || 2000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="महङ्गी भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={row.hasMahangiGhata === false}
                                value={row.hasMahangiGhata !== false ? (row.mahangiGhata !== undefined ? row.mahangiGhata : 2000) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'mahangiGhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasMahangiGhata !== false ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [K] दुर्गम भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasDurgamBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasDurgamBhata', checked);
                                  if (checked && (!row.durgamBhata || row.durgamBhata === 0)) {
                                    handleFieldChange(teacher.id, 'durgamBhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="दुर्गम भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasDurgamBhata}
                                value={row.hasDurgamBhata ? (row.durgamBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'durgamBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasDurgamBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [L] प्रोत्साहन भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasProtsahanBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasProtsahanBhata', checked);
                                  if (checked && (!row.protsahanBhata || row.protsahanBhata === 0)) {
                                    handleFieldChange(teacher.id, 'protsahanBhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="प्रोत्साहन भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasProtsahanBhata}
                                value={row.hasProtsahanBhata ? (row.protsahanBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'protsahanBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasProtsahanBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [M] अन्य भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasOtherBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasOtherBhata', checked);
                                  if (checked && (!row.otherBhata || row.otherBhata === 0)) {
                                    handleFieldChange(teacher.id, 'otherBhata', 500);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="अन्य भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasOtherBhata}
                                value={row.hasOtherBhata ? (row.otherBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'otherBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasOtherBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [N] जम्मा भत्ता (N = I + J + K + L + M) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-purple-950 bg-purple-100/70">
                            <div className="flex items-center justify-end gap-1">
                              <span>{calc.N?.toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSingleEditData({ ...row, ...calc });
                                  setIsSingleEditModalOpen(true);
                                }}
                                className="text-[9px] text-purple-700 hover:text-purple-950 underline cursor-pointer"
                                title="Detailed allowance view"
                              >
                                ⚙️
                              </button>
                            </div>
                          </td>

                          {/* [O] मासिक जम्मा (H + N) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-purple-950 bg-purple-50">
                            {calc.O?.toLocaleString()}
                          </td>

                          {/* [P] त्रैमासिक / कुल तलब भत्ता (O * MonthCount) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-[#1e3a5f] bg-blue-100/60 text-xs">
                            {calc.P?.toLocaleString()}
                          </td>

                          {/* [Q] कोष २०% कट्टी */}
                          <td className="py-2 px-2 text-right font-mono text-rose-800 bg-rose-50/40">
                            {calc.Q?.toLocaleString()}
                          </td>

                          {/* [R] सापट कट्टी */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.karmachariKoshSapati || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'karmachariKoshSapati', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right font-mono text-xs bg-transparent border-b border-rose-300 focus:outline-hidden text-rose-800"
                              placeholder="0"
                            />
                          </td>

                          {/* [S] बीमा कट्टी */}
                          <td className="py-2 px-2 text-right font-mono text-rose-800">
                            {calc.S?.toLocaleString()}
                          </td>

                          {/* [T] जम्मा कट्टी (Q + R + S) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-rose-900 bg-rose-100/70">
                            {calc.T?.toLocaleString()}
                          </td>

                          {/* [U] बाँकी पाउनु पर्ने (P - T) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-gray-900 bg-slate-50">
                            {calc.U?.toLocaleString()}
                          </td>

                          {/* [V] चाडपर्व खर्च */}
                          <td className="py-2 px-2 text-right font-mono text-purple-900">
                            <input
                              type="checkbox"
                              checked={row.includeChaadparba || false}
                              onChange={(e) => handleFieldChange(teacher.id, 'includeChaadparba', e.target.checked)}
                              className="rounded text-purple-600 mr-1 cursor-pointer"
                              title="Include 1 Month Dashain Allowance"
                            />
                            {calc.V ? calc.V.toLocaleString() : '-'}
                          </td>

                          {/* [W] पोसाक भत्ता */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.poshakBhata || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'poshakBhata', parseFloat(e.target.value) || 0)}
                              className="w-14 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [X] जम्मा रकम (U + V + W) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-gray-950 bg-emerald-50/50">
                            {calc.X?.toLocaleString()}
                          </td>

                          {/* [Y] सा.सु. कर १% */}
                          <td className="py-2 px-2 text-right font-mono text-amber-900">
                            {calc.Y?.toLocaleString()}
                          </td>

                          {/* [Z] खुद भुक्तानी पाउनु पर्ने */}
                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/80 text-xs">
                            रू {calc.Z?.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* ═════════ STICKY GRAND TOTAL FOOTER ═════════ */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-20 shadow-2xl">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-left font-black tracking-wide text-amber-300">
                      कुल जम्मा (GRAND TOTAL: {grandTotals.count} जना शिक्षक/कर्मचारी):
                    </td>
                    <td colSpan={15}></td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-amber-300 text-sm">
                      रू {grandTotals.totalGrossP.toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-rose-300 text-sm">
                      - रू {grandTotals.totalDeductionT.toLocaleString()}
                    </td>
                    <td></td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {grandTotals.totalFestivalV.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-200">
                      रू {grandTotals.totalDressW.toLocaleString()}
                    </td>
                    <td></td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">
                      - रू {grandTotals.totalTaxY.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-300 text-base bg-emerald-950/80 border-l-2 border-emerald-400">
                      रू {grandTotals.totalNetZ.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: PAYROLL HISTORY & SLIPS ════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-[#1e3a5f]">Generated Payroll History (निकासा विवरण तथा भरपाई अभिलेख)</h2>
              <p className="text-xs text-gray-500 font-nepali">पहिले तयार वा भुक्तानी गरिएका शिक्षक/कर्मचारी तलब भरपाईको सूची</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold">
                <Calendar size={13} className="text-[#1e3a5f]" />
                <span className="text-[#1e3a5f]">आर्थिक वर्ष:</span>
                <select
                  value={historyFYFilter}
                  onChange={(e) => setHistoryFYFilter(e.target.value)}
                  className="bg-transparent font-bold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">सबै आर्थिक वर्षहरू (All FY)</option>
                  {(financialYearsData || []).map((fy: any) => (
                    <option key={fy.id} value={fy.id.toString()}>
                      आ.व. {fy.year} {fy.isActive ? '(चालु)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-gray-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-gray-200">
                कुल भरपाई: {(payrollsData || []).filter((p: any) => historyFYFilter === 'ALL' || p.financialYearId?.toString() === historyFYFilter).length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-4 py-3.5 font-bold uppercase">Teacher Name</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Type & Taha</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Period (महिना)</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">Grade सहित तलब</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">कुल तलब भत्ता</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">जम्मा कट्टी</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">खुद पाउने रकम</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-center">Status</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isPayrollsLoading ? (
                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">Loading payroll records...</td></tr>
                  ) : (payrollsData || []).filter((p: any) => historyFYFilter === 'ALL' || p.financialYearId?.toString() === historyFYFilter).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">
                        <Wallet size={28} className="mx-auto text-gray-300 mb-1" />
                        <p className="text-sm font-semibold text-gray-600">No payroll records found for this fiscal year</p>
                      </td>
                    </tr>
                  ) : (
                    (payrollsData || [])
                      .filter((p: any) => historyFYFilter === 'ALL' || p.financialYearId?.toString() === historyFYFilter)
                      .map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 font-bold text-gray-900">
                          {p.teacher?.fullName || '—'}
                          {p.teacher?.fullNameNepali && (
                            <p className="text-[10px] text-gray-500 font-nepali">{p.teacher.fullNameNepali}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            {p.teacher?.type === 'RASTRIYA' ? 'स्थाई (Govt)' : 'निजी स्रोत'}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-0.5">{p.taha} - {p.shreni}</p>
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
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status === 'PAID' ? '✓ PAID' : 'DRAFT'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSlip(p)}
                              className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[10px] font-extrabold shadow-2xs transition cursor-pointer"
                              title="Print Individual Pay Slip"
                            >
                              <Printer size={12} />
                              <span>Slip</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete payroll record for "${p.teacher?.fullName || 'Staff'}"?`)) {
                                  await api.delete(`/payroll/${p.id}`);
                                  toast.success('Record deleted');
                                  queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
                                }
                              }}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 size={13} />
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

      {/* ════════════════════ TAB 3: SALARY SCALES & GRADES ════════════════════ */}
      {activeTab === 'scales' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Settings size={16} />
                <span>Nepal Government Teacher Salary Scales & Grade Rates (नेपाल सरकार तलब स्केल तथा ग्रेड दर)</span>
              </h2>
              <p className="text-xs text-gray-500 font-nepali">
                तह तथा श्रेणी अनुसारको आधारभूत मूल तलब [A] र प्रति ग्रेड दर [C] सम्पादन तथा व्यवस्थापन
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seedScalesMutation.mutate()}
                disabled={seedScalesMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset to Official Nepal GoN Scales</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingScale(null);
                  setScaleForm({ taha: 'माध्यमिक तह', shreni: 'तृतीय श्रेणी', moolTalab: 43689, gradeAmount: 1456 });
                  setIsScaleModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Salary Scale</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="px-4 py-3.5 font-bold uppercase">क्र.सं.</th>
                  <th className="px-4 py-3.5 font-bold uppercase">तह / श्रेणी (Taha & Shreni)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">सुरु मूल तलब (Basic Salary A)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">प्रति ग्रेड दर (Grade Rate C)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">Status</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isScalesLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading salary scales...</td></tr>
                ) : (scalesData || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No salary scales registered. Click &quot;Reset to Official Nepal GoN Scales&quot; above to initialize.
                    </td>
                  </tr>
                ) : (
                  scalesData.map((sc: any, idx: number) => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {sc.taha} <span className="text-gray-500 font-normal">({sc.shreni})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                        रू {sc.moolTalab?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-900">
                        रू {sc.gradeAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingScale(sc);
                              setScaleForm({
                                taha: sc.taha,
                                shreni: sc.shreni || '',
                                moolTalab: sc.moolTalab,
                                gradeAmount: sc.gradeAmount,
                              });
                              setIsScaleModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete scale "${sc.taha} - ${sc.shreni}"?`)) {
                                deleteScaleMutation.mutate(sc.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 size={14} />
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
      )}

      {/* ════════════ MODAL 1: DISBURSE VIA BANK (एकमुष्ट बैंक भुक्तानी) ════════════ */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                  <CreditCard className="text-emerald-600" size={18} />
                  <span>एकमुष्ट बैंक तलब निकासा (Bulk Bank Salary Allotment)</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-nepali">
                  {selectedTeacherIds.length} जना शिक्षक/कर्मचारीको कुल खुद तलब रकम निकासा गरी लेखा प्रणालीमा खर्च प्रविष्टि हुनेछ।
                </p>
              </div>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">कुल निकासा रकम (Net Disbursable):</span>
                <span className="text-xs font-semibold text-emerald-800">{selectedTeacherIds.length} Teachers / Staff</span>
              </div>
              <span className="text-xl font-black font-mono text-emerald-900">
                रू {grandTotals.totalNetZ.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">भुक्तानी गरिने विद्यालयको बैंक खाता (School Bank Account):</label>
                <select
                  value={disburseForm.bankAccountId}
                  onChange={(e) => setDisburseForm({ ...disburseForm, bankAccountId: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 font-semibold bg-white"
                >
                  <option value="">-- Choose Bank Account --</option>
                  {(bankAccountsData || []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (A/C: {b.accountNumber || b.accountNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">निकासा मिति BS (Date):</label>
                  <input
                    type="text"
                    value={disburseForm.paymentDateBs}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentDateBs: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">चेक नं. / भौचर नं. (Cheque/Voucher):</label>
                  <input
                    type="text"
                    placeholder="CHQ-10492 / VCH-01"
                    value={disburseForm.chequeNo}
                    onChange={(e) => setDisburseForm({ ...disburseForm, chequeNo: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कैफियत / टिप्पणी (Remarks / Narration):</label>
                <textarea
                  rows={2}
                  placeholder="आर्थिक वर्ष २०८३/०८४ त्रैमासिक तलब भत्ता निकासा..."
                  value={disburseForm.remarks}
                  onChange={(e) => setDisburseForm({ ...disburseForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={issueBulkPaymentMutation.isPending}
                onClick={() => issueBulkPaymentMutation.mutate()}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>{issueBulkPaymentMutation.isPending ? 'Processing...' : 'निकासा तथा खर्च प्रविष्टि गर्नुहोस्'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 2: DETAILED ALLOWANCES EDIT MODAL ════════════ */}
      {isSingleEditModalOpen && singleEditData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#1e3a5f]">
                  भत्ता विवरण सम्पादन: {singleEditData.fullName}
                </h3>
                <p className="text-[10.5px] text-gray-500">प्र.अ. भत्ता, महङ्गी, दुर्गम तथा प्रोत्साहन भत्ता समायोजन</p>
              </div>
              <button onClick={() => setIsSingleEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* [I] प्र.अ. भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasPraABhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasPraABhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.praABhata || bulkRows[singleEditData.teacherId]?.praABhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'praABhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>प्र.अ. भत्ता [I] (Principal Only)</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasPraABhata}
                  value={bulkRows[singleEditData.teacherId]?.hasPraABhata ? (bulkRows[singleEditData.teacherId]?.praABhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'praABhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasPraABhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* [J] महङ्गी भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasMahangiGhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.mahangiGhata || bulkRows[singleEditData.teacherId]?.mahangiGhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'mahangiGhata', globalDearnessAmount || 2000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>महङ्गी भत्ता [J]</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={bulkRows[singleEditData.teacherId]?.hasMahangiGhata === false}
                  value={bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false ? (bulkRows[singleEditData.teacherId]?.mahangiGhata !== undefined ? bulkRows[singleEditData.teacherId]?.mahangiGhata : 2000) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'mahangiGhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* [K] दुर्गम भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasDurgamBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasDurgamBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.durgamBhata || bulkRows[singleEditData.teacherId]?.durgamBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'durgamBhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>दुर्गम भत्ता [K]</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasDurgamBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasDurgamBhata ? (bulkRows[singleEditData.teacherId]?.durgamBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'durgamBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasDurgamBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* [L] प्रोत्साहन भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasProtsahanBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasProtsahanBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.protsahanBhata || bulkRows[singleEditData.teacherId]?.protsahanBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'protsahanBhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>प्रोत्साहन भत्ता [L]</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasProtsahanBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasProtsahanBhata ? (bulkRows[singleEditData.teacherId]?.protsahanBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'protsahanBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasProtsahanBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* [M] अन्य भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasOtherBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasOtherBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.otherBhata || bulkRows[singleEditData.teacherId]?.otherBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'otherBhata', 500);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>अन्य भत्ता [M]</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasOtherBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasOtherBhata ? (bulkRows[singleEditData.teacherId]?.otherBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'otherBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasOtherBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsSingleEditModalOpen(false)}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                सम्झनुहोस् (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 3: SALARY SCALE CREATE/EDIT ════════════ */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">
                {editingScale ? 'Edit Salary Scale' : 'Add New Salary Scale'}
              </h3>
              <button onClick={() => setIsScaleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">तह (Taha / Level):</label>
                <input
                  type="text"
                  placeholder="माध्यमिक तह / निम्न माध्यमिक तह / प्राथमिक तह"
                  value={scaleForm.taha}
                  onChange={(e) => setScaleForm({ ...scaleForm, taha: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">श्रेणी (Shreni):</label>
                <input
                  type="text"
                  placeholder="प्रथम श्रेणी / द्वितीय श्रेणी / तृतीय श्रेणी"
                  value={scaleForm.shreni}
                  onChange={(e) => setScaleForm({ ...scaleForm, shreni: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">सुरु मूल तलब (Basic Salary A):</label>
                <input
                  type="number"
                  value={scaleForm.moolTalab}
                  onChange={(e) => setScaleForm({ ...scaleForm, moolTalab: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">प्रति ग्रेड दर (Grade Rate C):</label>
                <input
                  type="number"
                  value={scaleForm.gradeAmount}
                  onChange={(e) => setScaleForm({ ...scaleForm, gradeAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveScaleMutation.isPending}
                onClick={() => saveScaleMutation.mutate()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#2a5280] rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ INDIVIDUAL PAY SLIP MODAL & PRINT ════════════ */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">
                आधिकारिक तलब स्लिप (Official Salary Slip): {selectedSlip.teacher?.fullName}
              </h3>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 space-y-3 text-xs">
              <div className="text-center border-b pb-2">
                <h4 className="font-extrabold text-[#1e3a5f] text-base">{schoolProfile?.nameNepali || 'श्री नेपाल माध्यमिक विद्यालय'}</h4>
                <p className="text-[10.5px] text-gray-500">{schoolProfile?.address || 'रौतहट'} | {selectedSlip.monthFrom} देखि {selectedSlip.monthTo} सम्म</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><strong>शिक्षकको नाम:</strong> {selectedSlip.teacher?.fullName}</div>
                <div><strong>पद / तह:</strong> {selectedSlip.taha} - {selectedSlip.shreni}</div>
                <div><strong>PAN No:</strong> {selectedSlip.teacher?.panNo || 'N/A'}</div>
                <div><strong>Bank A/C:</strong> {selectedSlip.teacher?.bankAccountNo || 'Bank Deposit'}</div>
              </div>

              <div className="space-y-1 border-t pt-2 font-mono">
                <div className="flex justify-between"><span>मूल तलब (A):</span><span>रू {selectedSlip.moolTalab?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>जम्मा ग्रेड ({selectedSlip.gradeNo} Grades D):</span><span>रू {selectedSlip.gradeRakam?.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-[#1e3a5f]"><span>जम्मा तलब (E):</span><span>रू {selectedSlip.gradeSahitTalab?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>जम्मा भत्ता (N):</span><span>रू {selectedSlip.jammaBhata?.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-blue-900"><span>त्रैमासिक निकासा (P):</span><span>रू {selectedSlip.traimasikTalan?.toLocaleString()}</span></div>
                <div className="flex justify-between text-rose-700"><span>जम्मा कट्टी (T):</span><span>- रू {selectedSlip.jammaKati?.toLocaleString()}</span></div>
                {selectedSlip.chaadparbaKharcha > 0 && (
                  <div className="flex justify-between text-purple-700"><span>चाडपर्व खर्च (V):</span><span>+ रू {selectedSlip.chaadparbaKharcha?.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-amber-800"><span>सा.सु. कर १% (Y):</span><span>- रू {selectedSlip.samajikSurakshaKar1Pct?.toLocaleString()}</span></div>
                <div className="flex justify-between font-extrabold text-sm text-emerald-800 bg-emerald-100 p-2 rounded-lg mt-2">
                  <span>खुद भुक्तानी रकम (Z):</span>
                  <span>रू {selectedSlip.khudPaaunuParne?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1e3a5f] rounded-xl flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ ADD PAST / HISTORICAL STAFF MODAL ════════════ */}
      {isAddPastStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    विगत / पूर्व शिक्षक वा कर्मचारीको अभिलेख (Historical Staff)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-nepali">
                    विगतका आर्थिक वर्षको तलब भरपाईका लागि दर्ता (Login Portal खाता बन्द रहनेछ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPastStaffOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
              <span>
                यो फारामबाट विगतमा सरुवा भएका, अवकाश पाएका वा राजिनामा दिएका शिक्षक/कर्मचारीको विवरण थपिनेछ। उनीहरूको कुनै पनि Login Portal सक्रिय हुने छैन र केवल तलब भरपाई तथा अभिलेखमा प्रयोग हुनेछ।
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pastStaffForm.fullName.trim()) {
                  toast.error('कृपया शिक्षक वा कर्मचारीको नाम प्रविष्ट गर्नुहोस्');
                  return;
                }
                addPastStaffMutation.mutate(pastStaffForm);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    कर्मचारीको पूरा नाम (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ram Prasad Sharma"
                    value={pastStaffForm.fullName}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, fullName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    नाम (नेपालीमा)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: राम प्रसाद शर्मा"
                    value={pastStaffForm.fullNameNepali}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, fullNameNepali: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-nepali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">प्रकार / वर्ग</label>
                  <select
                    value={pastStaffForm.shreni}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPastStaffForm({
                        ...pastStaffForm,
                        shreni: val,
                        post: val === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'मा.वि. शिक्षक',
                        taha: val === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'माध्यमिक तह',
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="TEACHING">शिक्षक (Teaching Staff)</option>
                    <option value="NON_TEACHING">गैर-शैक्षिक कर्मचारी (Non-Teaching Staff)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">दरबन्दी प्रकार</label>
                  <select
                    value={pastStaffForm.type}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="RASTRIYA">स्थायी / दरबन्दी (National/Permanent)</option>
                    <option value="RAHAT">राहत शिक्षक (Rahat)</option>
                    <option value="KARAR">करार शिक्षक (Contract)</option>
                    <option value="NIJI_SROTH">निजी स्रोत (School Source)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">तह (Taha / Level)</label>
                  <input
                    type="text"
                    placeholder="माध्यमिक तह / निम्न माध्यमिक तह / प्राथमिक तह"
                    value={pastStaffForm.taha}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, taha: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">पद (Post)</label>
                  <input
                    type="text"
                    placeholder="उदा: शिक्षक, सह-लेखापाल, पियन"
                    value={pastStaffForm.post}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, post: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">स्थायी लेखा नं. (PAN No)</label>
                  <input
                    type="text"
                    placeholder="PAN No"
                    value={pastStaffForm.panNo}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, panNo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">अवस्था / कारण (Status)</label>
                  <select
                    value={pastStaffForm.statusReason}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, statusReason: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="सरुवा (Transferred)">सरुवा (Transferred)</option>
                    <option value="अनिवार्य अवकाश (Retired)">अनिवार्य अवकाश (Retired)</option>
                    <option value="राजिनामा (Resigned)">राजिनामा (Resigned)</option>
                    <option value="अन्य पूर्व कर्मचारी (Past Staff)">अन्य पूर्व कर्मचारी (Past Staff)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPastStaffOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addPastStaffMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  <span>{addPastStaffMutation.isPending ? 'थप्दैछ...' : 'सुरक्षित गर्नुहोस् (Add Past Staff)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
