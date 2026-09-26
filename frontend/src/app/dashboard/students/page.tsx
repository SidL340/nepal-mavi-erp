'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Users,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  KeyRound,
  Sparkles,
  ArrowRightLeft,
  GraduationCap,
  PieChart,
  Cake,
  FileCheck,
  UserCheck,
  RotateCcw,
  BookOpen,
  TrendingUp,
  Award,
  Languages,
  HeartHandshake,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'admission' | 'upgrade' | 'transferred' | 'analytics'>('directory');
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'chart' | 'table'>('chart');

  // Filters (IEMIS Standard Filter Bar: Year, Class, Section, Search)
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [search, setSearch] = useState('');
  const [forceLoadAll, setForceLoadAll] = useState(false);
  const [batchYearFilter, setBatchYearFilter] = useState('');
  const [analyticsYear, setAnalyticsYear] = useState('');

  // ── UPGRADE & PROMOTION PORTAL STATE ────────────────────────────────────
  const [promoteFromYear, setPromoteFromYear] = useState('');
  const [promoteFromClass, setPromoteFromClass] = useState('');
  const [promoteToYear, setPromoteToYear] = useState('');
  const [promoteToClass, setPromoteToClass] = useState('');
  const [studentPromoteState, setStudentPromoteState] = useState<{
    [id: number]: {
      action: 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'TRANSFER';
      targetClassId?: string;
      rollNo?: number | string;
      selected: boolean;
    };
  }>({});
  const [selectAllPromote, setSelectAllPromote] = useState(true);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState('');
  const [importAcademicYearId, setImportAcademicYearId] = useState('');
  const [treatNoEmisAsTransferred, setTreatNoEmisAsTransferred] = useState(true);
  const [isCreatingNewYear, setIsCreatingNewYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Transfer Modal
  const [transferModalStudent, setTransferModalStudent] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({
    transferSchoolName: '',
    transferEmisCode: '',
    transferAddress: '',
    transferDateBs: todayBS(),
    transferReason: 'Guardian relocation / higher studies',
    tcNumber: '',
  });

  // Password Reset Modal
  const [resetModalStudent, setResetModalStudent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Admission Form State
  const [admissionForm, setAdmissionForm] = useState({
    fullName: '',
    fullNameNepali: '',
    emisId: '',
    gender: 'Male',
    dateOfBirthBs: '',
    classId: '',
    rollNo: '',
    admissionDateBs: todayBS(),
    fatherName: '',
    motherName: '',
    guardianName: '',
    guardianContact: '',
    parentCitizenshipNo: '',
    address: '',
    ethnicity: '',
    prevSchoolName: '',
    prevEmisCode: '',
  });

  const [collectedDocs, setCollectedDocs] = useState<{ [key: string]: boolean }>({
    birthCertificate: false,
    transferCertificate: false,
    marksheet: false,
    photos: false,
    citizenshipCopy: false,
  });

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Academic Years
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years-all'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });

  // Determine if on-demand filter or search is active
  const isFilterActive = Boolean(
    selectedYear ||
    selectedClass ||
    (selectedSection && selectedSection !== 'all') ||
    search.trim() ||
    forceLoadAll
  );

  // Fetch Active Students On-Demand
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', search, selectedYear, selectedClass, selectedSection, forceLoadAll],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedYear && selectedYear !== 'all') params.append('academicYearId', selectedYear);
      if (selectedClass && selectedClass !== 'all') params.append('classId', selectedClass);
      if (selectedSection && selectedSection !== 'all') params.append('section', selectedSection);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'directory' && isFilterActive,
  });

  // Fetch Eligible Students for Class Promotion / Upgrade
  const { data: sourceClassStudents = [], isLoading: isSourceClassLoading } = useQuery({
    queryKey: ['promote-source-students', promoteFromYear, promoteFromClass],
    queryFn: async () => {
      if (!promoteFromClass) return [];
      const params = new URLSearchParams();
      if (promoteFromYear && promoteFromYear !== 'all') params.append('academicYearId', promoteFromYear);
      params.append('classId', promoteFromClass);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'upgrade' && Boolean(promoteFromClass),
  });

  // Fetch Transferred/Alumni Students
  const { data: transferredData, isLoading: isTransferredLoading } = useQuery({
    queryKey: ['transferred-students', batchYearFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (batchYearFilter) params.append('batchYear', batchYearFilter);
      const res = await api.get(`/students/transferred?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'transferred',
  });

  // Fetch Student Analytics
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['student-analytics', analyticsYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (analyticsYear && analyticsYear !== 'all') params.append('academicYearId', analyticsYear);
      const res = await api.get(`/students/analytics?${params.toString()}`);
      return res.data?.data;
    },
    enabled: activeTab === 'analytics',
  });

  // Admission Mutation
  const admissionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/students/admission', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `विद्यार्थी भर्ना सफल भयो! Login: ${data.data?.credentials?.username || 'Created'} (Pass: ${data.data?.credentials?.plainPassword || '123456'})`,
        { duration: 6000 }
      );
      // Reset form
      setAdmissionForm({
        fullName: '',
        fullNameNepali: '',
        emisId: '',
        gender: 'Male',
        dateOfBirthBs: '',
        classId: '',
        rollNo: '',
        admissionDateBs: todayBS(),
        fatherName: '',
        motherName: '',
        guardianName: '',
        guardianContact: '',
        parentCitizenshipNo: '',
        address: '',
        ethnicity: '',
        prevSchoolName: '',
        prevEmisCode: '',
      });
      setCollectedDocs({
        birthCertificate: false,
        transferCertificate: false,
        marksheet: false,
        photos: false,
        citizenshipCopy: false,
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      setActiveTab('directory');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to complete admission');
    },
  });

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionForm.fullName || !admissionForm.guardianContact) {
      toast.error('कृपया विद्यार्थीको पूरा नाम र सम्पर्क नम्बर अनिवार्य भर्नुहोस्');
      return;
    }
    admissionMutation.mutate({
      ...admissionForm,
      collectedDocs,
    });
  };

  // Transfer Out Mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferModalStudent) return;
      const res = await api.post(`/students/${transferModalStudent.id}/transfer`, transferForm);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Student transferred out successfully');
      setTransferModalStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to transfer student');
    },
  });

  // Reactivate Student Mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/students/${id}/reactivate`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Student reactivated into active directory!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reactivate student');
    },
  });

  // Password Reset Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalStudent || !newPassword) return;
      const res = await api.post(`/students/${resetModalStudent.id}/reset-password`, {
        newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset successfully!');
      setResetModalStudent(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });

  // Quick Create Academic Year Mutation
  const quickCreateYearMutation = useMutation({
    mutationFn: async (yearName: string) => {
      const parts = yearName.split('-');
      const startBs = `${parts[0]}-01-01`;
      const endBs = parts[1] ? `${parts[0].slice(0, 2)}${parts[1]}-12-30` : `${parts[0]}-12-30`;
      const res = await api.post('/classes/academic-years', {
        year: yearName.trim(),
        startDateBs: startBs,
        endDateBs: endBs,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`नयाँ शैक्षिक सत्र "${data.data?.year}" थपियो!`);
      queryClient.invalidateQueries({ queryKey: ['academic-years-all'] });
      setImportAcademicYearId(String(data.data?.id));
      setIsCreatingNewYear(false);
      setNewYearInput('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create academic year');
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const { created, upgradedOrEnrolled, updated, transferred, skipped, academicYear, errors } = data.results || {};
      toast.success(
        `आयात सफल! सत्र: ${academicYear || ''} | नयाँ: ${created || 0} | स्तरोन्नति/कक्षा इतिहास: ${upgradedOrEnrolled || updated || 0} | सरुवा अभिलेख: ${transferred || 0}`,
        { duration: 7000 }
      );
      if (errors?.length > 0) {
        toast.error(`${errors.length} पंक्तिका विवरण आयात हुन सकेन।`);
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to import Excel');
    },
  });

  const [showFormatGuide, setShowFormatGuide] = useState(false);

  // Download Sample IEMIS Excel / CSV Template (Exact 21-Column IEMIS Standard)
  const handleDownloadTemplate = () => {
    const headers = [
      'S.N',
      'IEMIS Code',
      'School',
      'Student IEMIS Id',
      'Student Name',
      'Student Name in Nepali',
      'Gender',
      'Father Name',
      'Mother Name',
      'Class',
      'Section',
      'Year',
      'Permanent Address',
      'Temporary Address',
      'DOB',
      'Is Transferred',
      'Mother Tongue',
      'Disability Type',
      'Age',
      'Guardian Name',
      'Guardian Contact Number',
    ];

    const sampleRows = [
      [
        '1',
        '320160005',
        'Nepal Secondary School',
        '3201600058003308',
        'Aachal Kumari',
        '',
        'Female',
        'Rajesh Raut Kurmi',
        'Gujeshwori Devi',
        '8',
        '',
        '2082',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2068-06-17',
        'No',
        'Bajjika',
        'No Disability',
        '14',
        'Rajesh Raut Kurmi',
        '9825519506',
      ],
      [
        '2',
        '320160005',
        'Nepal Secondary School',
        '3201600057601760',
        'Aachal Patel',
        '',
        'Female',
        'Rambishwas Patel',
        'Sima Devi',
        '6',
        '',
        '2082',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2072-10-11',
        'No',
        'Bajjika',
        'No Disability',
        '10',
        'Rambishwas Patel',
        '9812345678',
      ],
      [
        '3',
        '320160005',
        'Nepal Secondary School',
        '3201600058003388',
        'Aadesh Paswan',
        '',
        'Male',
        'Ram Adhar Paswan',
        'Anita Paswan',
        '2',
        '',
        '2082',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2075-07-27',
        'No',
        'Bhojpuri',
        'No Disability',
        '7',
        'Ram Adhar Paswan',
        '9803456789',
      ],
      [
        '4',
        '320160005',
        'Nepal Secondary School',
        '3201600057701806',
        'Aadhity Patel',
        '',
        'Male',
        'Bachan Raut Kurmi',
        'Sharmila Devi',
        '6',
        '',
        '2082',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2069-06-30',
        'No',
        'Nepali',
        'No Disability',
        '13',
        'Bachan Raut Kurmi',
        '',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'iemis_student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('नेपाल सरकार IEMIS मानक एक्सेल/CSV ढाँचा डाउनलोड भयो!');
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('कृपया Excel फाइल (.xlsx / .xls) छनोट गर्नुहोस्');
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    if (importClassId) formData.append('classId', importClassId);
    if (importAcademicYearId) formData.append('academicYearId', importAcademicYearId);
    formData.append('treatNoEmisAsTransferred', String(treatNoEmisAsTransferred));
    bulkImportMutation.mutate(formData);
  };

  // Bulk Student Upgrade / Promotion Mutation
  const bulkUpgradeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/students/bulk-upgrade', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'विद्यार्थी कक्षा स्तरोन्नति सफल भयो!', { duration: 7000 });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['promote-source-students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setStudentPromoteState({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'विद्यार्थी स्तरोन्नति गर्न सकिएन।');
    },
  });

  // Auto-Assign Roll Numbers Mutation
  const autoRollMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedClass
        ? `/classes/${selectedClass}/auto-roll-numbers`
        : '/classes/auto-roll-numbers/all';
      const res = await api.post(endpoint);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Roll numbers assigned in alphabetical order!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign roll numbers');
    },
  });

  const students = studentsData?.data || [];
  const transferredList = transferredData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Users className="text-[#1e3a5f]" />
            <span>Student Management (विद्यार्थी प्रशासन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नयाँ भर्ना पोर्टल, चालु विद्यार्थी विवरण, स्थानान्तरण (Transfer-out) तथा शैक्षिक तथ्याङ्क विश्लेषण
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex flex-wrap rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('directory')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'directory' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            <span>Active Directory (विद्यार्थी सूची)</span>
          </button>
          <button
            onClick={() => setActiveTab('admission')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'admission' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <UserCheck size={14} />
            <span>Admission Portal (नयाँ भर्ना)</span>
          </button>
          <button
            onClick={() => setActiveTab('upgrade')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'upgrade' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <GraduationCap size={15} className={activeTab === 'upgrade' ? 'text-amber-300' : 'text-emerald-600'} />
            <span>Upgrade Students (कक्षा स्तरोन्नति)</span>
          </button>
          <button
            onClick={() => setActiveTab('transferred')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'transferred' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Transferred / Alumni (स्थानान्तरण)</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <PieChart size={14} />
            <span>Demographics & Analytics (तथ्याङ्क)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: ACTIVE DIRECTORY ════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* IEMIS Standard Filter Bar: Year, Class, Section, Search & Actions */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
              {/* Year Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Year (शैक्षिक सत्र) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Select Year (सत्र छनोट)</option>
                  <option value="all">All Years (सबै सत्र)</option>
                  {academicYearsData?.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Class (कक्षा) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Select Class (कक्षा छनोट)</option>
                  <option value="all">All Classes (सबै कक्षा)</option>
                  {classesData
                    ?.filter((cls: any) => !selectedYear || selectedYear === 'all' || String(cls.academicYearId) === String(selectedYear))
                    .map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Section (सेक्सन)
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="all">All (सबै)</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
              </div>

              {/* Search by student name/ID/contact */}
              <div className="md:col-span-1 lg:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Search Student (खोजी)
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, IEMIS ID, phone..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setForceLoadAll(false);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Clear / Reset Filter Button */}
              <div>
                {isFilterActive ? (
                  <button
                    onClick={() => {
                      setSelectedYear('');
                      setSelectedClass('');
                      setSelectedSection('all');
                      setSearch('');
                      setForceLoadAll(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                  >
                    <RotateCcw size={13} />
                    <span>रिसेट (Reset)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setForceLoadAll(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                  >
                    <Users size={13} />
                    <span>सबै लोड (All)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 gap-2">
              <div className="flex items-center gap-2">
                {isFilterActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>
                      {isLoading ? 'खोज्दै...' : `जम्मा भेटिएका विद्यार्थी: ${studentsData?.total ?? students.length} जना`}
                    </span>
                  </span>
                )}
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Assign roll numbers in alphabetical order (A to Z) for all students in this class?')) {
                        autoRollMutation.mutate();
                      }
                    }}
                    disabled={autoRollMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                    title="Alphabetical Roll Numbers Auto Sequence"
                  >
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>{autoRollMutation.isPending ? 'Sorting...' : 'Auto Roll No'}</span>
                  </button>

                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/students/credentials/export${selectedClass && selectedClass !== 'all' ? `?classId=${selectedClass}` : ''}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                    title="Download IDs and login credentials for students"
                  >
                    <Download size={14} className="text-blue-600" />
                    <span>Export Logins</span>
                  </a>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                  >
                    <FileSpreadsheet size={14} />
                    <span>IEMIS Excel Import</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('admission')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2a5280] transition shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>New Admission</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Students Content Area: Prompt when no filter vs Table when filtered */}
          {!isFilterActive ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-12 text-center shadow-2xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-[#1e3a5f] flex items-center justify-center mb-4 shadow-xs">
                <Search size={28} className="text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                विद्यार्थी विवरण हेर्न Year र Class छनोट गर्नुहोस्
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
                माथिका फिल्टरहरू (<strong>Year</strong>, <strong>Class</strong>, <strong>Section</strong>) छनोट गर्नुहोस् वा विद्यार्थीको नाम / IEMIS कोड टाइप गरी खोजी गर्नुहोस्।
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setForceLoadAll(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2b5182] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Users size={14} />
                  <span>सबै सक्रिय विद्यार्थी लोड गर्नुहोस् (Load All Students)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-3 py-3.5 font-bold uppercase text-center w-14">Roll</th>
                      <th className="px-4 py-3.5 font-bold uppercase">Student Details</th>
                      <th className="px-4 py-3.5 font-bold uppercase">IEMIS ID</th>
                      <th className="px-4 py-3.5 font-bold uppercase">Class & Sec</th>
                      <th className="px-4 py-3.5 font-bold uppercase">Parent / Contact</th>
                      <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                          <p className="mt-2 text-xs">विद्यार्थी विवरण खोज्दै...</p>
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">
                          <Users size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-600">छनोट गरिएको फिल्टर अनुसार कुनै विद्यार्थी फेला परेन</p>
                          <p className="text-xs text-gray-400">कृपया अन्य कक्षा, सत्र वा खोज शब्द प्रयोग गर्नुहोस्।</p>
                        </td>
                      </tr>
                    ) : (
                      students.map((student: any) => {
                        const enrollment = student.classEnrollment?.[0];
                        return (
                          <tr key={student.id} className="hover:bg-blue-50/40 transition">
                            <td className="px-3 py-3 text-center">
                              {enrollment?.rollNo ? (
                                <span className="inline-flex min-w-[24px] h-6 px-1.5 items-center justify-center rounded-lg bg-indigo-50 font-bold text-[11px] text-indigo-700 border border-indigo-100 shadow-2xs">
                                  {enrollment.rollNo}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-mono">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                                  {student.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{student.fullName}</p>
                                  {student.fullNameNepali && (
                                    <p className="text-[10px] text-gray-500 font-nepali">{student.fullNameNepali}</p>
                                  )}
                                  <span className="text-[10px] text-gray-400">
                                    DOB: {student.dateOfBirthBs || 'N/A'} ({student.gender || 'N/A'})
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                                {student.studentId}
                              </span>
                            </td>

                          <td className="px-4 py-3">
                            {enrollment?.class ? (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                {enrollment.class.name} {enrollment.class.section ? `- ${enrollment.class.section}` : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Not Assigned</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{student.fatherName || student.guardianName || '—'}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{student.guardianContact || student.phone || '—'}</p>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/dashboard/finance/fees?studentId=${student.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 transition"
                              >
                                <span>Fee</span>
                              </Link>
                              <Link
                                href={`/dashboard/students/${student.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#1e3a5f] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </Link>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => {
                                      setTransferModalStudent(student);
                                      setTransferForm({
                                        transferSchoolName: '',
                                        transferEmisCode: '',
                                        transferAddress: '',
                                        transferDateBs: todayBS(),
                                        transferReason: 'Guardian request / shifted to new location',
                                        tcNumber: `TC-${todayBS().split('-')[0]}-${student.studentId?.slice(-3) || '001'}`,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-600 hover:text-white px-2 py-1 text-[11px] font-bold text-amber-700 transition"
                                    title="Transfer out to another school"
                                  >
                                    <ArrowRightLeft size={12} />
                                    <span>Transfer</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setResetModalStudent(student);
                                      setNewPassword('123456');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-600 hover:text-white px-2 py-1 text-[11px] font-semibold text-purple-700 transition"
                                    title="Reset student password"
                                  >
                                    <KeyRound size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-slate-50/50 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Total Active Students: <strong className="font-bold text-gray-900">{students.length}</strong>
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">Nepal Secondary School ERP Record</span>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 2: ADMISSION PORTAL ════════════════════ */}
      {activeTab === 'admission' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-lg font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <UserCheck className="text-emerald-600" />
              <span>Student Admission & Intake Portal (विद्यार्थी नयाँ भर्ना फारम)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              विद्यार्थीको व्यक्तिगत विवरण, अभिभावकको सम्पर्क, अघिल्लो विद्यालयको EMIS र संकलित कागजात चेकलिस्ट
            </p>
          </div>

          <form onSubmit={handleAdmissionSubmit} className="space-y-6 text-xs">
            {/* 1. Basic Student Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>१. विद्यार्थीको व्यक्तिगत विवरण (Personal Details)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input
                    required
                    type="text"
                    value={admissionForm.fullName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fullName: e.target.value })}
                    placeholder="e.g. Sujan Shrestha"
                    className="erp-input font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">पूरा नाम (नेपालीमा)</label>
                  <input
                    type="text"
                    value={admissionForm.fullNameNepali}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fullNameNepali: e.target.value })}
                    placeholder="उदा. सुजन श्रेष्ठ"
                    className="erp-input font-nepali"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gender (लिङ्ग) *</label>
                  <select
                    value={admissionForm.gender}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, gender: e.target.value })}
                    className="erp-input font-semibold"
                  >
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other (अन्य)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Birth (BS) *</label>
                  <input
                    type="text"
                    value={admissionForm.dateOfBirthBs}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, dateOfBirthBs: e.target.value })}
                    placeholder="2068-04-15"
                    className="erp-input font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">IEMIS ID (यदि छ भने)</label>
                  <input
                    type="text"
                    value={admissionForm.emisId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, emisId: e.target.value })}
                    placeholder="Auto if empty"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ethnicity / Caste (जाति)</label>
                  <input
                    type="text"
                    value={admissionForm.ethnicity}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, ethnicity: e.target.value })}
                    placeholder="Brahmin / Chhetri / Janajati / Dalit"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Permanent Address (ठेगाना)</label>
                  <input
                    type="text"
                    value={admissionForm.address}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, address: e.target.value })}
                    placeholder="Municipality, Ward, District"
                    className="erp-input"
                  />
                </div>
              </div>
            </div>

            {/* 2. Academic Enrollment */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>२. कक्षा भर्ना विवरण (Class & Academic Info)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assign Class (भर्ना हुने कक्षा) *</label>
                  <select
                    value={admissionForm.classId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, classId: e.target.value })}
                    className="erp-input font-semibold"
                  >
                    <option value="">Select Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Roll Number</label>
                  <input
                    type="number"
                    value={admissionForm.rollNo}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, rollNo: e.target.value })}
                    placeholder="Auto sequence if empty"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admission Date BS (भर्ना मिति)</label>
                  <input
                    type="text"
                    value={admissionForm.admissionDateBs}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, admissionDateBs: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Previous School Name (पहिले पढेको विद्यालय)</label>
                  <input
                    type="text"
                    value={admissionForm.prevSchoolName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, prevSchoolName: e.target.value })}
                    placeholder="e.g. Shree Janakalyan Basic School"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Previous School EMIS Code (पहिलेको विद्यालयको EMIS)</label>
                  <input
                    type="text"
                    value={admissionForm.prevEmisCode}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, prevEmisCode: e.target.value })}
                    placeholder="e.g. 320160001"
                    className="erp-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Parents & Guardians */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>३. अभिभावक तथा सम्पर्क विवरण (Parents & Contact)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Father's Full Name (बुवाको नाम)</label>
                  <input
                    type="text"
                    value={admissionForm.fatherName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fatherName: e.target.value })}
                    placeholder="Father full name"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother's Full Name (आमाको नाम)</label>
                  <input
                    type="text"
                    value={admissionForm.motherName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, motherName: e.target.value })}
                    placeholder="Mother full name"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Contact Number * (सम्पर्क नं.)</label>
                  <input
                    required
                    type="tel"
                    value={admissionForm.guardianContact}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardianContact: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Name (यदि बुवा/आमा बाहेक भए)</label>
                  <input
                    type="text"
                    value={admissionForm.guardianName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardianName: e.target.value })}
                    placeholder="Guardian name & relationship"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Parent Citizenship / ID No (नागरिकता नं.)</label>
                  <input
                    type="text"
                    value={admissionForm.parentCitizenshipNo}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, parentCitizenshipNo: e.target.value })}
                    placeholder="e.g. 32-01-75-01234"
                    className="erp-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. Document Verification Checklist */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <FileCheck size={15} className="text-blue-600" />
                <span>४. संकलित कागजात चेकलिस्ट (Submitted Document Checklist)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-dashed border-gray-300 bg-slate-50/50">
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.birthCertificate}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, birthCertificate: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Birth Certificate</p>
                    <p className="text-[10px] text-gray-500">जन्म दर्ता प्रमाणपत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.transferCertificate}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, transferCertificate: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Transfer Certificate (TC)</p>
                    <p className="text-[10px] text-gray-500">चारित्रिक / स्थानान्तरण पत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.marksheet}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, marksheet: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Previous Marksheet</p>
                    <p className="text-[10px] text-gray-500">अघिल्लो कक्षाको लब्धाङ्क पत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.photos}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, photos: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">PP Photos (2 copies)</p>
                    <p className="text-[10px] text-gray-500">पासपोर्ट साइज फोटो - २ प्रति</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.citizenshipCopy}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, citizenshipCopy: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Parent's Citizenship</p>
                    <p className="text-[10px] text-gray-500">अभिभावक नागरिकता प्रतिलिपि</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={admissionMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md transition disabled:opacity-60"
              >
                {admissionMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Admitting Student...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Complete Admission (भर्ना दर्ता गर्नुहोस्)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════ TAB 3: UPGRADE & PROMOTION PORTAL ════════════════════ */}
      {activeTab === 'upgrade' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/60 p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base md:text-lg font-black text-emerald-950 flex items-center gap-2">
                  <GraduationCap className="text-emerald-700" size={24} />
                  <span>Student Promotion & Class Upgrade Portal (विद्यार्थी कक्षा स्तरोन्नति पोर्टल)</span>
                </h2>
                <p className="text-xs text-emerald-900/80 mt-1 max-w-3xl leading-relaxed">
                  शैक्षिक सत्र समाप्तिपछि विद्यार्थीहरूलाई नयाँ शैक्षिक सत्रको अर्को कक्षामा स्तरोन्नति (Promote / Upgrade) गर्नुहोस्, कक्षा दोहोर्‍याउनुहोस् (Repeat), वा कक्षा १० र १२ का विद्यार्थीहरूलाई उत्तीर्ण (Graduate / Pass-out) गराउनुहोस्।
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition shadow-2xs"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>IEMIS Excel बाट आयात गरी स्तरोन्नति</span>
                </button>
              </div>
            </div>

            {/* Dual Option Guidance Banner */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200/60 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200/80 text-emerald-950 flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">विकल्प १ (Direct ERP Batch Upgrade):</strong>
                  <span>तलको फारमबाट वर्तमान कक्षा र नयाँ सत्रको कक्षा छनोट गरी एकै क्लिकमा सबै वा छानिएका विद्यार्थीहरूलाई स्तरोन्नति गर्नुहोस्।</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-teal-200/80 text-teal-950 flex items-start gap-2">
                <FileSpreadsheet size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">विकल्प २ (Re-import Next Year IEMIS):</strong>
                  <span>यदि तपाईंसँग नयाँ वर्षको IEMIS Excel फाइल छ भने सिधै आयात गर्दा पनि प्रणालीले पुरानो विद्यार्थी पहिचान गरी स्वतः नयाँ कक्षामा जोड्दछ।</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promotion Transition Control Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <span>१. सत्र तथा कक्षा छनोट (Select Academic Year & Class Transition)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left: Source Year & Class */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <p className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">FROM</span>
                  <span>वर्तमान शैक्षिक सत्र तथा कक्षा (Current Class & Year)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">वर्तमान शैक्षिक सत्र *</label>
                    <select
                      value={promoteFromYear}
                      onChange={(e) => setPromoteFromYear(e.target.value)}
                      className="erp-input bg-white text-xs"
                    >
                      <option value="">-- सत्र छनोट गर्नुहोस् --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">वर्तमान कक्षा (From Class) *</label>
                    <select
                      value={promoteFromClass}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setPromoteFromClass(newClassId);
                        setStudentPromoteState({});
                        // Auto-suggest next class if possible
                        const currentCls = classesData?.find((c: any) => String(c.id) === String(newClassId));
                        if (currentCls) {
                          const match = currentCls.name.match(/\d+/);
                          if (match) {
                            const nextNum = parseInt(match[0]) + 1;
                            const targetCls = classesData?.find((c: any) => c.name.includes(String(nextNum)) && (promoteToYear ? String(c.academicYearId) === String(promoteToYear) : true));
                            if (targetCls) setPromoteToClass(String(targetCls.id));
                          }
                        }
                      }}
                      className="erp-input bg-white text-xs font-bold"
                    >
                      <option value="">-- कक्षा छनोट गर्नुहोस् --</option>
                      {classesData
                        ?.filter((c: any) => !promoteFromYear || String(c.academicYearId) === String(promoteFromYear))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right: Target Year & Class */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <p className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">TO</span>
                  <span>नयाँ शैक्षिक सत्र तथा अर्को कक्षा (Target Next Class & Year)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">नयाँ शैक्षिक सत्र (To Year) *</label>
                    <select
                      value={promoteToYear}
                      onChange={(e) => setPromoteToYear(e.target.value)}
                      className="erp-input bg-white text-xs font-bold text-emerald-900"
                    >
                      <option value="">-- नयाँ सत्र छनोट गर्नुहोस् --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">नयाँ कक्षा (Target Class) *</label>
                    <select
                      value={promoteToClass}
                      onChange={(e) => setPromoteToClass(e.target.value)}
                      className="erp-input bg-white text-xs font-bold text-emerald-900"
                    >
                      <option value="">-- स्तरोन्नति हुने कक्षा छनोट --</option>
                      {classesData
                        ?.filter((c: any) => !promoteToYear || String(c.academicYearId) === String(promoteToYear))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Roster & Promotion Actions Table */}
          {promoteFromClass ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    २. विद्यार्थीहरूको स्तरोन्नति स्थिति (Student Promotion Roster)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    प्रत्येक विद्यार्थीको लागि स्तरोन्नति (Promote), दोहोर्‍याउने (Repeat), वा उत्तीर्ण (Graduate) स्थिति चयन गर्नुहोस्।
                  </p>
                </div>

                {/* Batch Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'PROMOTE', selected: true, targetClassId: promoteToClass };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <CheckCircle2 size={13} />
                    <span>सबैलाई स्तरोन्नति (Promote All)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'GRADUATE', selected: true };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <GraduationCap size={13} />
                    <span>सबै उत्तीर्ण (Graduate All - SEE/12)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'REPEAT', selected: true, targetClassId: promoteFromClass };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <RotateCcw size={13} />
                    <span>सबै दोहोर्‍याउने (Repeat All)</span>
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-3 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectAllPromote}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectAllPromote(isChecked);
                            const updated: any = { ...studentPromoteState };
                            sourceClassStudents.forEach((s: any) => {
                              updated[s.id] = {
                                ...(updated[s.id] || { action: 'PROMOTE', targetClassId: promoteToClass }),
                                selected: isChecked,
                              };
                            });
                            setStudentPromoteState(updated);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                        />
                      </th>
                      <th className="px-3 py-3 text-center w-14">Roll</th>
                      <th className="px-4 py-3">Student Name (विद्यार्थी)</th>
                      <th className="px-4 py-3">IEMIS ID</th>
                      <th className="px-4 py-3 text-center">स्तरोन्नति कार्य (Promotion Action)</th>
                      <th className="px-4 py-3">नयाँ कक्षा (Target Class)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isSourceClassLoading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <p className="mt-2 text-xs">विद्यार्थी सूची लोड हुँदैछ...</p>
                        </td>
                      </tr>
                    ) : sourceClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <Users size={30} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-600">यो कक्षामा कुनै विद्यार्थी भेटिएन</p>
                          <p className="text-xs text-gray-400">कृपया अर्को कक्षा वा सत्र छनोट गर्नुहोस्।</p>
                        </td>
                      </tr>
                    ) : (
                      sourceClassStudents.map((s: any) => {
                        const curState = studentPromoteState[s.id] || { action: 'PROMOTE', selected: true, targetClassId: promoteToClass };
                        const isSelected = curState.selected !== false;
                        const action = curState.action || 'PROMOTE';
                        const enrollment = s.classEnrollment?.[0];

                        return (
                          <tr key={s.id} className={`hover:bg-slate-50 transition ${!isSelected ? 'opacity-50 bg-gray-50' : ''}`}>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setStudentPromoteState({
                                    ...studentPromoteState,
                                    [s.id]: {
                                      ...curState,
                                      selected: e.target.checked,
                                    },
                                  });
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                              />
                            </td>

                            <td className="px-3 py-3 text-center font-bold text-gray-600">
                              {enrollment?.rollNo || '—'}
                            </td>

                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{s.fullName}</p>
                              {s.fullNameNepali && (
                                <p className="text-[10px] text-gray-500 font-nepali">{s.fullNameNepali}</p>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {s.gender || 'N/A'} | DOB: {s.dateOfBirthBs || '—'}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-700">
                              {s.studentId}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'PROMOTE', selected: true, targetClassId: promoteToClass },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'PROMOTE'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  <span>🟢 स्तरोन्नति</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'REPEAT', selected: true, targetClassId: promoteFromClass },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'REPEAT'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  <span>🟡 दोहोर्‍याउने</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'GRADUATE', selected: true },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'GRADUATE'
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  }`}
                                >
                                  <span>🎓 उत्तीर्ण</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'TRANSFER', selected: true },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'TRANSFER'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  }`}
                                >
                                  <span>🔴 सरुवा</span>
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {action === 'GRADUATE' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                  <GraduationCap size={12} /> उत्तीर्ण / Alumni
                                </span>
                              ) : action === 'TRANSFER' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                  <ArrowRightLeft size={12} /> स्थानान्तरण / TC
                                </span>
                              ) : (
                                <select
                                  value={curState.targetClassId || promoteToClass || ''}
                                  onChange={(e) => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: {
                                        ...curState,
                                        targetClassId: e.target.value,
                                      },
                                    });
                                  }}
                                  className="erp-input text-xs py-1 font-semibold"
                                >
                                  <option value="">-- कक्षा छनोट --</option>
                                  {classesData
                                    ?.filter((c: any) => !promoteToYear || String(c.academicYearId) === String(promoteToYear))
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} {c.section ? `(${c.section})` : ''}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Execution Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="text-xs text-gray-600">
                  <span>जम्मा छनोट भएका विद्यार्थी: </span>
                  <strong className="font-bold text-emerald-800">
                    {sourceClassStudents.filter((s: any) => (studentPromoteState[s.id]?.selected ?? true)).length} जना
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={
                    bulkUpgradeMutation.isPending ||
                    !promoteToYear ||
                    sourceClassStudents.length === 0
                  }
                  onClick={() => {
                    const selectedList = sourceClassStudents
                      .filter((s: any) => (studentPromoteState[s.id]?.selected ?? true))
                      .map((s: any) => {
                        const st = studentPromoteState[s.id] || { action: 'PROMOTE', targetClassId: promoteToClass };
                        return {
                          studentId: s.id,
                          action: st.action || 'PROMOTE',
                          targetClassId: st.targetClassId || promoteToClass,
                        };
                      });

                    if (selectedList.length === 0) {
                      toast.error('कृपया कम्तीमा एक विद्यार्थी छनोट गर्नुहोस्।');
                      return;
                    }

                    if (confirm(`के तपाईं ${selectedList.length} जना विद्यार्थीहरूलाई नयाँ शैक्षिक सत्रमा स्तरोन्नति/अपग्रेड गर्न निश्चित हुनुहुन्छ?`)) {
                      bulkUpgradeMutation.mutate({
                        fromAcademicYearId: promoteFromYear ? parseInt(promoteFromYear) : null,
                        fromClassId: promoteFromClass ? parseInt(promoteFromClass) : null,
                        toAcademicYearId: parseInt(promoteToYear),
                        toClassId: promoteToClass ? parseInt(promoteToClass) : null,
                        studentPromotions: selectedList,
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
                >
                  {bulkUpgradeMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>स्तरोन्नति कार्य जारी छ...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap size={16} />
                      <span>विद्यार्थी स्तरोन्नति कार्यान्वयन गर्नुहोस् (Execute Promotion)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-12 text-center shadow-2xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 shadow-xs">
                <GraduationCap size={30} />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                विद्यार्थी स्तरोन्नतिका लागि कक्षा छनोट गर्नुहोस्
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                माथिको फारमबाट वर्तमान शैक्षिक सत्र र कक्षा छनोट गर्नासाथ विद्यार्थीहरूको सूची यहाँ देखा पर्नेछ।
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 4: TRANSFERRED & ALUMNI ════════════════════ */}
      {activeTab === 'transferred' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-amber-600" />
                <span>Transferred & Alumni Records (स्थानान्तरण तथा पूर्व विद्यार्थी अभिलेख)</span>
              </h2>
              <p className="text-xs text-gray-500 font-nepali">
                अर्को विद्यालयमा स्थानान्तरण भएका वा उत्तीर्ण भएर गएका विद्यार्थीहरूको स्थायी अभिलेख
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by Batch Year (e.g. 2081)..."
                value={batchYearFilter}
                onChange={(e) => setBatchYearFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-4 py-3.5 font-bold uppercase">Student Name</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Status</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Transferred To (जाने विद्यालय)</th>
                    <th className="px-4 py-3.5 font-bold uppercase">School EMIS</th>
                    <th className="px-4 py-3.5 font-bold uppercase">TC No / Date</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Reason</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isTransferredLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                        <p className="mt-2 text-xs">Loading records...</p>
                      </td>
                    </tr>
                  ) : transferredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <ArrowRightLeft size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-600">No transferred records</p>
                        <p className="text-xs text-gray-400">Students marked as transferred will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    transferredList.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{st.fullName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {st.studentId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.status === 'TRANSFERRED'
                                ? 'bg-amber-100 text-amber-800'
                                : st.status === 'GRADUATED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-800">{st.transferSchoolName || '—'}</p>
                          <p className="text-[10px] text-gray-500">{st.transferAddress || '—'}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {st.transferEmisCode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-purple-700">{st.tcNumber || '—'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{st.transferDateBs || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                          {st.transferReason || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Reactivate ${st.fullName} back into active school directory?`)) {
                                reactivateMutation.mutate(st.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition"
                            title="Reactivate student back to active school directory"
                          >
                            <RotateCcw size={12} />
                            <span>Reactivate</span>
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

      {/* ════════════════════ TAB 4: DEMOGRAPHICS & ANALYTICS ════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {isAnalyticsLoading ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#1e3a5f] border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-gray-600">लोड हुँदैछ... Fetching comprehensive demographic analytics...</p>
            </div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#1e3a5f] to-[#0f243e] p-5 rounded-2xl text-white shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-white/10 rounded-xl">
                      <PieChart size={20} className="text-amber-400" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold tracking-wide">Student Demographics & Academic Analytics</h2>
                      <p className="text-xs text-blue-100/80 font-nepali">विद्यार्थी जनसांख्यिकी, उत्तीर्ण दर, मातृभाषा तथा कक्षागत विस्तृत विश्लेषण</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  {/* Academic Year Filter Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 backdrop-blur-xs">
                    <span className="text-[11px] font-bold text-blue-200">शैक्षिक सत्र:</span>
                    <select
                      value={analyticsYear}
                      onChange={(e) => setAnalyticsYear(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="" className="text-gray-900 bg-white">-- सबै / सक्रिय सत्र (Active Year) --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id} className="text-gray-900 bg-white">
                          सत्र {ay.year} {ay.isActive ? '⭐ (चालू सत्र)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['student-analytics'] })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition backdrop-blur-xs border border-white/10 shadow-xs"
                    title="Reload Live Analytics Data"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* ─── ROW 1: 5 KEY DEMOGRAPHIC & ACADEMIC KPI CARDS ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Active Enrolled Students */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Students</p>
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Users size={14} />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#1e3a5f] mt-1.5">{analyticsData?.summary?.totalActive || 0}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 pt-2 border-t border-blue-100/60 font-nepali">
                    <span>चालु भर्ना संख्या</span>
                    <span className="font-sans font-bold text-blue-700">कुल {analyticsData?.summary?.total || 0}</span>
                  </div>
                </div>

                {/* 2. Gender Ratio (Girls vs Boys) */}
                <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender Ratio</p>
                    <span className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
                      <Sparkles size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-lg font-black text-blue-700">
                      ♂ {analyticsData?.rates?.boyPercentage || 0}%
                    </span>
                    <span className="text-xs text-gray-400 font-bold">:</span>
                    <span className="text-lg font-black text-pink-600">
                      ♀ {analyticsData?.rates?.girlPercentage || 0}%
                    </span>
                  </div>
                  {/* Visual Dual Progress Bar */}
                  <div className="mt-2">
                    <div className="h-2 w-full bg-pink-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${analyticsData?.rates?.boyPercentage || 50}%` }}
                        className="bg-blue-600 h-full"
                        title={`Boys: ${analyticsData?.genderDistribution?.MALE || 0}`}
                      />
                      <div
                        style={{ width: `${analyticsData?.rates?.girlPercentage || 50}%` }}
                        className="bg-pink-500 h-full"
                        title={`Girls: ${analyticsData?.genderDistribution?.FEMALE || 0}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1">
                      <span className="text-blue-700">छात्र: {analyticsData?.genderDistribution?.MALE || 0}</span>
                      <span className="text-pink-600">छात्रा: {analyticsData?.genderDistribution?.FEMALE || 0}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Academic Passed Rate */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Passed Rate</p>
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Award size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <p className="text-2xl font-black text-emerald-700">{analyticsData?.rates?.passedRate || 96.2}%</p>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                      उत्तीर्ण
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${analyticsData?.rates?.passedRate || 96.2}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1 font-nepali">शैक्षिक स्तर तथा स्तरोन्नति</p>
                  </div>
                </div>

                {/* 4. Transferred vs Retention Rate */}
                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retention Rate</p>
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <ArrowRightLeft size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <p className="text-2xl font-black text-[#1e3a5f]">{analyticsData?.rates?.retentionRate || 95}%</p>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      स्था. {analyticsData?.rates?.transferredRate || 0}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full bg-amber-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${analyticsData?.rates?.retentionRate || 95}%` }}
                        className="bg-[#1e3a5f] h-full"
                        title="Retention Rate"
                      />
                      <div
                        style={{ width: `${analyticsData?.rates?.transferredRate || 5}%` }}
                        className="bg-amber-500 h-full"
                        title="Transferred Rate"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 font-semibold mt-1 font-nepali">
                      स्थानान्तरण: {analyticsData?.summary?.totalTransferred || 0} जना
                    </p>
                  </div>
                </div>

                {/* 5. Online Portal Login Users */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Portal Logins</p>
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <KeyRound size={14} />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-indigo-700 mt-1.5">{analyticsData?.summary?.activeUsersWithLogin || 0}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-900 pt-2 border-t border-indigo-100/60 font-nepali">
                    <span>अनलाइन अकाउन्ट</span>
                    <span className="font-sans font-bold text-indigo-600">
                      {analyticsData?.summary?.totalActive > 0
                        ? Math.round(((analyticsData?.summary?.activeUsersWithLogin || 0) / analyticsData?.summary?.totalActive) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── ROW 2: CLASS-WISE ENROLLMENT & GENDER DISTRIBUTION (CHART & TABLE) ─── */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-4 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Building size={16} className="text-[#1e3a5f]" />
                      <span>Class-wise Student Enrollment & Gender Distribution (कक्षागत विद्यार्थी संख्या)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                      शिशु (ECD) देखि कक्षा १२ सम्मको छात्र/छात्रा संख्या र लैंगिक अनुपात
                    </p>
                  </div>

                  {/* View Mode Toggle: Chart vs Table */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 self-start sm:self-auto shadow-2xs">
                    <button
                      onClick={() => setAnalyticsViewMode('chart')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                        analyticsViewMode === 'chart'
                          ? 'bg-[#1e3a5f] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 size={13} />
                      <span>Bar Chart</span>
                    </button>
                    <button
                      onClick={() => setAnalyticsViewMode('table')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                        analyticsViewMode === 'table'
                          ? 'bg-[#1e3a5f] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <FileCheck size={13} />
                      <span>Data Table</span>
                    </button>
                  </div>
                </div>

                {/* ── Visual Bar Chart Mode ── */}
                {analyticsViewMode === 'chart' ? (
                  <div className="p-6">
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100 text-xs">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-blue-600 shadow-2xs" />
                          <span className="font-bold text-gray-700">Boys (छात्र संख्या)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-pink-500 shadow-2xs" />
                          <span className="font-bold text-gray-700">Girls (छात्रा संख्या)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-purple-400 shadow-2xs" />
                          <span className="font-bold text-gray-700">Other (अन्य)</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 font-nepali">
                        प्रत्येक कक्षामा छात्र र छात्राको तुलनात्मक बार
                      </span>
                    </div>

                    {/* Chart Container */}
                    {(!analyticsData?.classStats || analyticsData.classStats.length === 0) ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        No class enrollment data available.
                      </div>
                    ) : (
                      <div className="mt-6">
                        {/* Calculate max total for scale */}
                        {(() => {
                          const maxClassTotal = Math.max(...analyticsData.classStats.map((c: any) => c.total || 1), 1);
                          return (
                            <div className="space-y-4">
                              {analyticsData.classStats.map((cs: any) => {
                                const total = cs.total || (cs.boys + cs.girls + cs.other);
                                const boyPct = total > 0 ? Math.round((cs.boys / total) * 100) : 0;
                                const girlPct = total > 0 ? Math.round((cs.girls / total) * 100) : 0;
                                const widthPct = Math.max(8, Math.round((total / maxClassTotal) * 100));

                                return (
                                  <div key={cs.id} className="group p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-gray-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-[#1e3a5f] text-sm tracking-tight min-w-[130px]">
                                          {cs.name} {cs.section ? `(${cs.section})` : ''}
                                        </span>
                                        <span className="font-extrabold text-gray-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md text-[11px] border border-blue-100">
                                          Total: {total}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] font-mono">
                                        <span className="text-blue-700 font-bold">♂ {cs.boys} ({boyPct}%)</span>
                                        <span className="text-pink-600 font-bold">♀ {cs.girls} ({girlPct}%)</span>
                                        {cs.other > 0 && <span className="text-purple-600 font-bold">• {cs.other}</span>}
                                      </div>
                                    </div>

                                    {/* Multi-Segment Proportion Bar */}
                                    <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden flex items-center shadow-inner">
                                      {/* Total scale bar container */}
                                      <div style={{ width: `${widthPct}%` }} className="h-full flex transition-all duration-500">
                                        {cs.boys > 0 && (
                                          <div
                                            style={{ width: `${(cs.boys / total) * 100}%` }}
                                            className="bg-gradient-to-r from-blue-700 to-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Boys: ${cs.boys} (${boyPct}%)`}
                                          >
                                            {cs.boys >= 3 ? `${cs.boys}` : ''}
                                          </div>
                                        )}
                                        {cs.girls > 0 && (
                                          <div
                                            style={{ width: `${(cs.girls / total) * 100}%` }}
                                            className="bg-gradient-to-r from-pink-500 to-rose-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Girls: ${cs.girls} (${girlPct}%)`}
                                          >
                                            {cs.girls >= 3 ? `${cs.girls}` : ''}
                                          </div>
                                        )}
                                        {cs.other > 0 && (
                                          <div
                                            style={{ width: `${(cs.other / total) * 100}%` }}
                                            className="bg-purple-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Other: ${cs.other}`}
                                          >
                                            {cs.other}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Summary metrics footer */}
                        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Total Active Classes:</span>
                            <span className="font-extrabold text-[#1e3a5f] font-mono">{analyticsData?.classStats?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Avg Class Strength:</span>
                            <span className="font-extrabold text-blue-700 font-mono">
                              {analyticsData?.classStats?.length > 0
                                ? Math.round((analyticsData?.summary?.totalActive || 0) / analyticsData.classStats.length)
                                : 0} students
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Gender Parity Index:</span>
                            <span className="font-extrabold text-emerald-700 font-mono">
                              {analyticsData?.rates?.boyPercentage > 0
                                ? (analyticsData?.rates?.girlPercentage / analyticsData?.rates?.boyPercentage).toFixed(2)
                                : '1.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Detailed Table Mode ── */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#1e3a5f] text-white">
                        <tr>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Class / Section (कक्षा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-blue-800">Boys (छात्र)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-pink-800">Girls (छात्रा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center">Other</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-slate-900">Total (जम्मा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center">Gender Ratio Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsData?.classStats?.map((cs: any) => {
                          const total = cs.total || (cs.boys + cs.girls + cs.other);
                          const boyPct = total > 0 ? Math.round((cs.boys / total) * 100) : 0;
                          const girlPct = total > 0 ? Math.round((cs.girls / total) * 100) : 0;
                          return (
                            <tr key={cs.id} className="hover:bg-blue-50/30 transition">
                              <td className="px-4 py-3 font-extrabold text-gray-900">
                                {cs.name} {cs.section ? `(${cs.section})` : ''}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-blue-700">{cs.boys}</td>
                              <td className="px-4 py-3 text-center font-bold text-pink-700">{cs.girls}</td>
                              <td className="px-4 py-3 text-center text-gray-500">{cs.other}</td>
                              <td className="px-4 py-3 text-center font-black text-gray-900 bg-slate-50">
                                {total}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                                  <span className="text-[10px] font-mono text-blue-700 font-bold">{boyPct}%</span>
                                  <div className="flex-1 h-2 bg-pink-200 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${boyPct}%` }} className="bg-blue-600 h-full" />
                                  </div>
                                  <span className="text-[10px] font-mono text-pink-600 font-bold">{girlPct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ─── ROW 3: MOTHER TONGUE & LANGUAGE DISTRIBUTION ─── */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Languages size={16} className="text-indigo-600" />
                      <span>Mother Tongue & Language Demographics (मातृभाषा अनुसार विद्यार्थी विवरण)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                      IEMIS अभिलेख तथा विद्यार्थी फारम अनुसार मातृभाषाको प्रतिशत तथा संख्या
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto font-nepali">
                    भाषिक विविधता सूचक
                  </span>
                </div>

                {/* Multi-segment Language Distribution Bar */}
                {analyticsData?.languages && analyticsData.languages.length > 0 && (
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {analyticsData.languages.map((lang: any, index: number) => {
                        const colors = [
                          'bg-blue-600',
                          'bg-emerald-600',
                          'bg-amber-500',
                          'bg-pink-500',
                          'bg-purple-600',
                          'bg-cyan-600',
                          'bg-rose-600',
                          'bg-indigo-600',
                        ];
                        const colorClass = colors[index % colors.length];
                        return (
                          <div
                            key={lang.name}
                            style={{ width: `${Math.max(lang.percentage, 2)}%` }}
                            className={`${colorClass} h-full transition-all duration-500`}
                            title={`${lang.name}: ${lang.count} (${lang.percentage}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Language Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                  {analyticsData?.languages?.map((lang: any, index: number) => {
                    const bgColors = [
                      'bg-blue-50 border-blue-200 text-blue-900',
                      'bg-emerald-50 border-emerald-200 text-emerald-900',
                      'bg-amber-50 border-amber-200 text-amber-900',
                      'bg-pink-50 border-pink-200 text-pink-900',
                      'bg-purple-50 border-purple-200 text-purple-900',
                      'bg-cyan-50 border-cyan-200 text-cyan-900',
                      'bg-rose-50 border-rose-200 text-rose-900',
                      'bg-indigo-50 border-indigo-200 text-indigo-900',
                    ];
                    const bgStyle = bgColors[index % bgColors.length];

                    return (
                      <div
                        key={lang.name}
                        className={`p-3.5 rounded-xl border ${bgStyle} shadow-2xs flex flex-col justify-between`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-extrabold text-xs">{lang.name}</p>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-lg font-black font-mono">{lang.count}</span>
                          <span className="text-xs font-bold">{lang.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── ROW 4: AGE DEMOGRAPHICS, INCLUSIVITY & BIRTHDAY CELEBRATIONS ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Age Group Demographics */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Users size={15} />
                      <span>Age Groups (उमेर समूह वितरण)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">विद्यार्थीहरूको उमेर विभाजन</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {analyticsData?.ageGroups &&
                      Object.entries(analyticsData.ageGroups).map(([group, count]: [string, any]) => {
                        const totalActive = analyticsData?.summary?.totalActive || 1;
                        const pct = Math.round((count / totalActive) * 100);
                        return (
                          <div key={group} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Age {group} Years</span>
                              <span className="font-mono text-gray-700 font-bold">
                                {count} students ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-[#1e3a5f] to-blue-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 2. Inclusivity & Special Needs Support */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <HeartHandshake size={15} className="text-emerald-600" />
                      <span>Inclusive Education (समावेशी शिक्षा)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">अपाङ्गता तथा फरक क्षमता स्थिति</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {analyticsData?.disabilityDistribution &&
                      Object.entries(analyticsData.disabilityDistribution).map(([type, count]: [string, any]) => {
                        const total = analyticsData?.summary?.total || 1;
                        const pct = Math.round((count / total) * 100);
                        const isSpecial = type.includes('अपाङ्गता') || type.includes('Differently');
                        return (
                          <div
                            key={type}
                            className={`p-3 rounded-xl border ${
                              isSpecial
                                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{type}</span>
                              <span className="font-mono font-black text-sm">{count}</span>
                            </div>
                            <div className="mt-2 h-2 w-full bg-white/80 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full ${isSpecial ? 'bg-amber-500' : 'bg-emerald-600'}`}
                              />
                            </div>
                            <div className="mt-1 text-right text-[10px] font-mono font-bold">
                              {pct}% of students
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Birthdays This Month & Today */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Cake size={15} className="text-pink-600" />
                      <span>Student Birthdays (जन्मदिन शुभकामना)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">आज र आगामी १४ दिन भित्रका जन्मदिन</p>
                  </div>
                  {(!analyticsData?.birthdaysThisMonth || analyticsData.birthdaysThisMonth.length === 0) ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No student birthdays recorded for this month.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {analyticsData.birthdaysThisMonth.map((st: any) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/60 border border-pink-100 text-xs hover:bg-pink-100/50 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center font-bold text-xs shadow-2xs">
                              🎂
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{st.fullName || st.name}</p>
                              <p className="text-[10px] text-gray-500">
                                Class: {st.classEnrollment?.[0]?.class?.name || st.class || '—'}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-pink-700 bg-white px-2 py-0.5 rounded-lg border border-pink-200 shadow-2xs text-[11px]">
                            {st.dateOfBirthBs || st.dateBs || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MODAL: TRANSFER OUT STUDENT ──────────────────────────────────── */}
      {transferModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Transfer Student Out (स्थानान्तरण फारम)</h3>
                <p className="text-[11px] text-gray-500">
                  {transferModalStudent.fullName} (ID: {transferModalStudent.studentId})
                </p>
              </div>
              <button onClick={() => setTransferModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Destination School Name (जाने विद्यालयको नाम) *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Shree Tribhuvan Secondary School"
                  value={transferForm.transferSchoolName}
                  onChange={(e) => setTransferForm({ ...transferForm, transferSchoolName: e.target.value })}
                  className="erp-input font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">School EMIS Code (विद्यालयको EMIS कोड)</label>
                  <input
                    type="text"
                    placeholder="e.g. 320160002"
                    value={transferForm.transferEmisCode}
                    onChange={(e) => setTransferForm({ ...transferForm, transferEmisCode: e.target.value })}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Transfer Date BS (मिति)</label>
                  <input
                    type="text"
                    value={transferForm.transferDateBs}
                    onChange={(e) => setTransferForm({ ...transferForm, transferDateBs: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Destination Address (ठेगाना)</label>
                  <input
                    type="text"
                    placeholder="Kathmandu, Nepal"
                    value={transferForm.transferAddress}
                    onChange={(e) => setTransferForm({ ...transferForm, transferAddress: e.target.value })}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">TC Number (प्रमाणपत्र / चलानी नं.)</label>
                  <input
                    type="text"
                    placeholder="TC-2081-001"
                    value={transferForm.tcNumber}
                    onChange={(e) => setTransferForm({ ...transferForm, tcNumber: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Transfer (स्थानान्तरणको कारण)</label>
                <input
                  type="text"
                  value={transferForm.transferReason}
                  onChange={(e) => setTransferForm({ ...transferForm, transferReason: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>नोट:</strong> स्थानान्तरण गरेपछि विद्यार्थी चालु नामावलीबाट हटेर "स्थानान्तरण अभिलेख" मा
                सुरक्षित रहनेछ। भविष्यमा पुनः भर्ना भएमा एक क्लिकमै सक्रिय गर्न सकिनेछ।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setTransferModalStudent(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferMutation.isPending || !transferForm.transferSchoolName}
                onClick={() => transferMutation.mutate()}
                className="rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-700 transition disabled:opacity-60"
              >
                {transferMutation.isPending ? 'Processing...' : 'Confirm Transfer (स्थानान्तरण सम्पन्न गर्नुहोस्)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET PASSWORD ────────────────────────────────────────── */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <KeyRound size={15} />
                <span>Reset Password</span>
              </h3>
              <button onClick={() => setResetModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-gray-700 font-semibold mb-1">
                Student: <strong>{resetModalStudent.fullName}</strong>
              </p>
              <p className="text-gray-500 font-mono text-[11px] mb-3">
                Login ID: {resetModalStudent.studentId}
              </p>

              <label className="block font-bold text-gray-700 mb-1">New Password *</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="erp-input font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalStudent(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetPasswordMutation.isPending || !newPassword}
                onClick={() => resetPasswordMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
              >
                {resetPasswordMutation.isPending ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: IEMIS EXCEL BULK IMPORT ───────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={20} />
                  <span>IEMIS Excel Bulk Import / विद्यार्थी आयात</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  नेपाल सरकारको आधिकारिक IEMIS Excel (.xlsx / .xls / .csv) बाट चालू वा विगतका शैक्षिक सत्रका विद्यार्थी आयात गर्नुहोस्
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Template Download & Format Guide Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <FileSpreadsheet size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-emerald-950">आधिकारिक एक्सेल ढाँचा (Standard Excel Template)</p>
                  <p className="text-[10px] text-emerald-700">IEMIS तथा नेपाल मावि ERP अनुकूल एक्सेल ढाँचा</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormatGuide(!showFormatGuide)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                >
                  {showFormatGuide ? 'स्तम्भ ढाँचा लुकाउनुहोस्' : 'स्तम्भ विवरण (Columns Format)'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white transition shadow-xs"
                >
                  <Download size={13} />
                  <span>ढाँचा डाउनलोड (Download Template)</span>
                </button>
              </div>
            </div>

            {/* Collapsible Format Guide Table */}
            {showFormatGuide && (
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <span className="font-extrabold text-[#1e3a5f]">Excel स्तम्भहरूको विवरण (Supported Columns):</span>
                  <span className="text-[10px] text-gray-500 font-mono">*.xlsx / *.xls / *.csv</span>
                </div>
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-200/80 text-gray-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-1.5">Column Header (IEMIS स्तम्भ)</th>
                        <th className="p-1.5">Required?</th>
                        <th className="p-1.5">Sample Value (उदाहरण)</th>
                        <th className="p-1.5">विवरण</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-sans">
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Student IEMIS Id / Student Id</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">3201600058003308</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको विशिष्ट पहिचान (दोहोरो भर्ना रोक्न र विगत सत्र लिङ्क गर्न)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-emerald-800">Student Name / FullName</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-red-700 bg-red-50 px-1 rounded">अनिवार्य *</span></td>
                        <td className="p-1.5 text-gray-600">Aachal Kumari</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको पूरा नाम (अङ्ग्रेजीमा)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Student Name in Nepali</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">आँचल कुमारी</td>
                        <td className="p-1.5 text-gray-600">नेपालीमा पूरा नाम</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Class</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">8 / 6 / 3 / 2 / Nursery</td>
                        <td className="p-1.5 text-gray-600">कक्षा स्वतः पहिचान तथा भर्ना हुन्छ</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Section</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">A / B / C</td>
                        <td className="p-1.5 text-gray-600">कक्षा सेक्सनल समूह</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Gender</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Female / Male / छात्रा / छात्र</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको लिंग</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">DOB</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">2068-06-17 / 2075-7-27</td>
                        <td className="p-1.5 text-gray-600">जन्म मिति (वि.सं.)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Father Name / Mother Name</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Rajesh Raut / Gujeshwori Devi</td>
                        <td className="p-1.5 text-gray-600">बुवा तथा आमाको नाम</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Guardian Name & Contact</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">9825519506</td>
                        <td className="p-1.5 text-gray-600">अभिभावकको नाम तथा फोन नम्बर</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Permanent Address</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Brindaban-1, Rautahat</td>
                        <td className="p-1.5 text-gray-600">स्थायी ठेगाना</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Mother Tongue</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Bajjika / Bhojpuri / Nepali / Tharu</td>
                        <td className="p-1.5 text-gray-600">मातृभाषा जनसांख्यिकी</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Disability Type</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">No Disability / None / अपाङ्गता</td>
                        <td className="p-1.5 text-gray-600">समावेशी शिक्षा स्थिति</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Is Transferred</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">No / Yes</td>
                        <td className="p-1.5 text-gray-600">सरुवा भइसकेका विद्यार्थीहरूलाई सिधै सरुवा अभिलेखमा राख्छ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <form onSubmit={handleBulkImportSubmit} className="space-y-4 text-xs mt-3">
              {/* Rules & Intelligence Banner */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3.5 text-blue-900 space-y-2 text-[11px]">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Sparkles size={15} className="text-indigo-600" />
                  <span>प्रणालीगत स्मार्ट स्तरोन्नति तथा पहिचान (Smart Upgrade & Identity Linking):</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-blue-800/90 text-[10.5px]">
                  <li>
                    <strong>एउटै विद्यार्थी (Same Student ID):</strong> यदि सोही Student ID / EMIS Code को विद्यार्थी प्रणालीमा पहिले नै छ भने, दोहोरो खाता नबनाई सोही विद्यार्थीको कक्षा अभिलेख (History) मा यो सत्रको कक्षा जोडिन्छ।
                  </li>
                  <li>
                    <strong>विगत सत्र (Past Academic Year):</strong> विगत सत्रको फाइल आयात गर्दा विद्यार्थीको हालको सक्रिय कक्षा प्रभावित हुँदैन, ऐतिहासिक शैक्षिक अभिलेख सुरक्षित रहन्छ।
                  </li>
                </ul>
              </div>

              {/* Academic Year Selection */}
              <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-800">
                    शैक्षिक सत्र छनोट (Academic Year) *
                  </label>
                  {!isCreatingNewYear && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewYear(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> नयाँ शैक्षिक सत्र थप्नुहोस्
                    </button>
                  )}
                </div>

                {isCreatingNewYear ? (
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-200">
                    <input
                      type="text"
                      placeholder="e.g. 2080-81 वा 2079-80"
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      className="erp-input text-xs py-1.5 flex-1"
                    />
                    <button
                      type="button"
                      disabled={!newYearInput || quickCreateYearMutation.isPending}
                      onClick={() => quickCreateYearMutation.mutate(newYearInput)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                    >
                      {quickCreateYearMutation.isPending ? 'थप्दै...' : 'सुरक्षित गर्नुहोस्'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewYear(false)}
                      className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-xs"
                    >
                      रद्द
                    </button>
                  </div>
                ) : (
                  <select
                    value={importAcademicYearId}
                    onChange={(e) => setImportAcademicYearId(e.target.value)}
                    className="erp-input bg-white font-medium"
                  >
                    <option value="">-- चालू / सक्रिय शैक्षिक सत्र (Active Year) --</option>
                    {academicYearsData?.map((ay: any) => (
                      <option key={ay.id} value={ay.id}>
                        सत्र: {ay.year} {ay.isActive ? '⭐ (चालू / सक्रिय सत्र - Active Year)' : '(विगत सत्र - Past Year)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Missing EMIS ID / Transferred Toggle */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={treatNoEmisAsTransferred}
                    onChange={(e) => setTreatNoEmisAsTransferred(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">
                      EMIS ID नभएका विद्यार्थीहरूलाई स्वतः 'सरुवा (Transferred)' अभिलेखमा राख्ने
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      विगतका सत्रमा विद्यालय छोडेका वा सरुवा भएका (EMIS ID नभएका) विद्यार्थीहरूलाई सक्रिय विद्यार्थी सूचीमा नराखी सरुवा/पूर्व विद्यार्थी (Transferred Alumni) अभिलेखमा सुरक्षित राख्छ।
                    </span>
                  </div>
                </label>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  निश्चित कक्षामा मात्र भर्ना गर्न चाहेमा छनोट गर्नुहोस् (वैकल्पिक / Optional):
                </label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="erp-input"
                >
                  <option value="">Excel को 'CurrentClass' स्तम्भबाट स्वतः कक्षा पहिचान गर्ने (Smart Multi-Class)</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Excel (.xlsx / .xls) File *</label>
                <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-gray-200 px-6 pt-5 pb-6 text-center hover:border-emerald-400 transition bg-slate-50">
                  <div className="space-y-1 text-center">
                    <Upload size={28} className="mx-auto text-emerald-600 mb-1" />
                    <div className="flex text-xs text-gray-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-bold text-emerald-600 hover:underline">
                        <span>Browse file</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {importFile ? (
                      <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> {importFile.name}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Nepal IEMIS Exported Excel Sheet (.xlsx / .xls)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={!importFile || bulkImportMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-xs"
                >
                  {bulkImportMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>IEMIS विवरण प्रशोधन तथा आयात हुँदैछ...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>विद्यार्थी आयात गर्नुहोस् (Import Students)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
