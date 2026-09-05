'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState('');

  // Fetch classes for dropdown filter
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch students (All at once)
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
  });

  // Add single student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/students', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Student created! Login ID: ${data.credentials?.username}`);
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create student');
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

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addStudentMutation.mutate(data);
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
  const total = studentsData?.total || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Students Directory (विद्यार्थी विवरण)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            विद्यार्थीहरूको व्यक्तिगत तथा शैक्षिक विवरण व्यवस्थापन, IEMIS आयात र वर्णानुक्रम अनुसार रोल नं.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Roll No */}
            <button
              onClick={() => {
                if (confirm('Assign roll numbers in alphabetical order (A to Z) for all students?')) {
                  autoRollMutation.mutate();
                }
              }}
              disabled={autoRollMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="Automatically assign sequential roll numbers (1, 2, 3...) alphabetically by student name"
            >
              <Sparkles size={14} className="text-indigo-600" />
              <span>{autoRollMutation.isPending ? 'Sorting...' : 'Auto Roll No (वर्णानुक्रम)'}</span>
            </button>

            {/* Export credentials */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/students/credentials/export${selectedClass ? `?classId=${selectedClass}` : ''}`}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
              title="Download IDs and login credentials for students"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Passwords</span>
            </a>

            {/* EMIS Bulk Import */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <FileSpreadsheet size={14} />
              <span>IEMIS Excel Import</span>
            </button>

            {/* Add Student */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2a5280] transition shadow-2xs"
            >
              <Plus size={14} />
              <span>Add Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, IEMIS ID, parent name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
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

      {/* Students Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-3 py-3.5 font-bold uppercase tracking-wider text-center w-16">Roll No</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Student Details</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">IEMIS / ID</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Class & Section</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Parents & Guardian</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                    <p className="mt-2 text-xs">Loading students...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">No students found</p>
                    <p className="text-xs text-gray-400">Import an EMIS Excel or add students manually.</p>
                  </td>
                </tr>
              ) : (
                students.map((student: any) => {
                  const enrollment = student.classEnrollment?.[0];
                  return (
                    <tr key={student.id} className="hover:bg-blue-50/40 transition">
                      {/* Roll No */}
                      <td className="px-3 py-3.5 text-center">
                        {enrollment?.rollNo ? (
                          <span className="inline-flex min-w-[26px] h-6 px-1.5 items-center justify-center rounded-lg bg-indigo-50 font-bold text-[11px] text-indigo-700 border border-indigo-100 shadow-2xs">
                            {enrollment.rollNo}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Name & Photo */}
                      <td className="px-4 py-3.5">
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

                      {/* IEMIS ID */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                          {student.studentId}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3.5">
                        {enrollment?.class ? (
                          <div>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {enrollment.class.name} {enrollment.class.section ? `- ${enrollment.class.section}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Not Assigned</span>
                        )}
                      </td>

                      {/* Parents */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800">{student.fatherName || student.guardianName || '—'}</p>
                        <p className="text-[10px] text-gray-400">Mother: {student.motherName || '—'}</p>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <p className="font-mono text-gray-700">{student.guardianContact || student.phone || '—'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{student.address || '—'}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/finance/fees?studentId=${student.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 transition"
                          >
                            <span>Collect Fee (शुल्क)</span>
                          </Link>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#1e3a5f] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info — All students loaded */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-slate-50/50 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Showing all <strong className="font-bold text-gray-900">{students.length}</strong> students {selectedClass ? `in selected class` : `across the school`}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Single Continuous View (एकै सूचीमा सबै)</span>
        </div>
      </div>

      {/* ─── MODAL 1: ADD STUDENT (Manual) ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">Add New Student (विद्यार्थी भर्ना फारम)</h2>
                <p className="text-[11px] text-gray-500">A user login ID & password will be auto-generated.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input required name="fullName" type="text" placeholder="e.g. Ramesh Thapa" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input name="fullNameNepali" type="text" placeholder="उदा. रमेश थापा" className="erp-input font-nepali" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Student / IEMIS ID</label>
                  <input name="emisId" type="text" placeholder="Optional (auto if empty)" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gender *</label>
                  <select name="gender" required className="erp-input">
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">DOB in BS (YYYY-MM-DD)</label>
                  <input name="dateOfBirthBs" type="text" placeholder="2068-05-15" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assign Class</label>
                  <select name="classId" className="erp-input">
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
                  <input name="rollNo" type="number" placeholder="1" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admission Date (भर्ना मिति BS)</label>
                  <input name="admissionDateBs" type="text" placeholder="2081-01-10" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Father's Name</label>
                  <input name="fatherName" type="text" placeholder="Father full name" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother's Name</label>
                  <input name="motherName" type="text" placeholder="Mother full name" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Name</label>
                  <input name="guardianName" type="text" placeholder="Guardian name" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Contact (Mobile No) *</label>
                  <input required name="guardianContact" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Permanent Address</label>
                  <input name="address" type="text" placeholder="District, Municipality, Ward" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother Tongue (मातृभाषा)</label>
                  <input name="ethnicity" type="text" placeholder="Nepali, Maithili, etc." className="erp-input" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStudentMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {addStudentMutation.isPending ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: IEMIS EXCEL BULK IMPORT ──────────────────────────────── */}
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
              {/* Expected column banner */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-3 text-[11px] text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  <span>Supports Standard Nepal IEMIS Columns:</span>
                </p>
                <p className="text-blue-800/80 mt-1 font-mono text-[10px] leading-relaxed">
                  S.N | IEMIS Code | Student Id | FullName | Gender | Father Name | Mother Name | CurrentClass | Section | Permanent Address | DOB | Guardian Contact Number
                </p>
              </div>

              {/* Class target selection */}
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

              {/* File upload drag/select */}
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
