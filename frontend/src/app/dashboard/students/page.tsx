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
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'admission' | 'transferred' | 'analytics'>('directory');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [batchYearFilter, setBatchYearFilter] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState('');

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

  // Fetch Active Students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', search, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedClass) params.append('classId', selectedClass);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'directory',
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
    queryKey: ['student-analytics'],
    queryFn: async () => {
      const res = await api.get('/students/analytics');
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

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const { created, skipped, errors } = data.results || {};
      toast.success(`Import complete! Added: ${created}, Skipped: ${skipped}`);
      if (errors?.length > 0) {
        toast.error(`${errors.length} rows had issues`);
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to import Excel');
    },
  });

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select an Excel file (.xlsx)');
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    if (importClassId) formData.append('classId', importClassId);
    bulkImportMutation.mutate(formData);
  };

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
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 w-full max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by name, IEMIS ID, contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden shadow-2xs transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter size={15} className="text-gray-400 shrink-0" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full sm:w-48 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden shadow-2xs transition"
                >
                  <option value="">All Classes (सबै कक्षा)</option>
                  {classesData?.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section ? `(${cls.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm('Assign roll numbers in alphabetical order (A to Z) for all students?')) {
                      autoRollMutation.mutate();
                    }
                  }}
                  disabled={autoRollMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                  title="Alphabetical Roll Numbers Auto Sequence"
                >
                  <Sparkles size={14} className="text-indigo-600" />
                  <span>{autoRollMutation.isPending ? 'Sorting...' : 'Auto Roll No'}</span>
                </button>

                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/students/credentials/export${selectedClass ? `?classId=${selectedClass}` : ''}`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                  title="Download IDs and login credentials for students"
                >
                  <Download size={14} className="text-blue-600" />
                  <span>Export Logins</span>
                </a>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                >
                  <FileSpreadsheet size={14} />
                  <span>IEMIS Excel Import</span>
                </button>

                <button
                  onClick={() => setActiveTab('admission')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2a5280] transition shadow-2xs"
                >
                  <Plus size={14} />
                  <span>New Admission</span>
                </button>
              </div>
            )}
          </div>

          {/* Students Table */}
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
                        <p className="mt-2 text-xs">Loading active students...</p>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-600">No active students found</p>
                        <p className="text-xs text-gray-400">Admit a student or import via IEMIS Excel sheet.</p>
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

      {/* ════════════════════ TAB 3: TRANSFERRED & ALUMNI ════════════════════ */}
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
            <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
              <p className="mt-2 text-xs">Loading analytics data...</p>
            </div>
          ) : (
            <>
              {/* Summary Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-gray-500">Active Students</p>
                  <p className="text-2xl font-black text-[#1e3a5f] mt-1">{analyticsData?.summary?.totalActive || 0}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">चालु भर्ना संख्या</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-gray-500">Transferred Out</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{analyticsData?.summary?.totalTransferred || 0}</p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5">स्थानान्तरण अभिलेख</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-gray-500">Graduated (Passout)</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{analyticsData?.summary?.totalGraduated || 0}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">उत्तीर्ण पूर्व विद्यार्थी</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
                  <p className="text-xs font-bold text-gray-500">Portal User Logins</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{analyticsData?.summary?.activeUsersWithLogin || 0}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">सक्रिय अनलाइन अकाउन्ट</p>
                </div>
              </div>

              {/* Class-wise Horizontal Demographic Table */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                    <Building size={15} />
                    <span>Class-wise Gender Distribution (कक्षागत विद्यार्थी संख्या)</span>
                  </h3>
                  <span className="text-[11px] text-gray-500 font-nepali">बालक तथा बालिका अनुपात</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-[#1e3a5f] text-white">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase">Class / Section</th>
                        <th className="px-4 py-3 font-bold uppercase text-center">Boys (छात्र)</th>
                        <th className="px-4 py-3 font-bold uppercase text-center">Girls (छात्रा)</th>
                        <th className="px-4 py-3 font-bold uppercase text-center">Other</th>
                        <th className="px-4 py-3 font-bold uppercase text-center bg-blue-900">Total (जम्मा)</th>
                        <th className="px-4 py-3 font-bold uppercase text-center">Gender Ratio</th>
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
                              <div className="flex items-center justify-center gap-1.5 max-w-[120px] mx-auto">
                                <span className="text-[10px] font-mono text-blue-600 font-bold">{boyPct}%</span>
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
              </div>

              {/* Age Group Distribution & Birthday Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Demographics */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Users size={15} />
                    <span>Age Group Demographics (उमेर समूह वितरण)</span>
                  </h3>
                  <div className="space-y-3">
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
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Birthdays Today & This Month */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Cake size={15} className="text-pink-600" />
                    <span>Student Birthdays (जन्मदिन शुभकामना सूची)</span>
                  </h3>
                  {analyticsData?.birthdaysThisMonth?.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No student birthdays recorded for this month.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {analyticsData?.birthdaysThisMonth?.map((st: any) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/60 border border-pink-100 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center font-bold text-xs">
                              🎂
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{st.fullName}</p>
                              <p className="text-[10px] text-gray-500">
                                Class: {st.classEnrollment?.[0]?.class?.name || '—'}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-pink-700 bg-white px-2.5 py-1 rounded-lg border border-pink-200 shadow-2xs">
                            {st.dateOfBirthBs}
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
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">IEMIS Excel Bulk Import</h2>
                <p className="text-[11px] text-gray-500">
                  Direct import from official Nepal IEMIS Excel format (.xlsx)
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-3 text-[11px] text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  <span>Supports Standard Nepal IEMIS Columns:</span>
                </p>
                <p className="text-blue-800/80 mt-1 font-mono text-[10px] leading-relaxed">
                  S.N | IEMIS Code | Student Id | FullName | Gender | Father Name | Mother Name | CurrentClass | Section | Permanent Address | DOB | Guardian Contact Number
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Assign Imported Students To Class (Optional):
                </label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="erp-input"
                >
                  <option value="">Auto-assign or Assign Later</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Excel (.xlsx / .xls) File *</label>
                <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-gray-200 px-6 pt-5 pb-6 text-center hover:border-emerald-400 transition bg-slate-50">
                  <div className="space-y-1 text-center">
                    <Upload size={28} className="mx-auto text-emerald-600 mb-1" />
                    <div className="flex text-xs text-gray-600">
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
                      <p className="text-[10px] text-gray-400">Nepal IEMIS Exported Excel Sheet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || bulkImportMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bulkImportMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Processing IEMIS Data...</span>
                    </>
                  ) : (
                    <span>Upload & Import Students</span>
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
