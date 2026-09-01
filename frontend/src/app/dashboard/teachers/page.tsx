'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  BookOpen,
  Award,
  Building,
  KeyRound,
  X,
  CreditCard,
  User,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [newCredentials, setNewCredentials] = useState<any>(null);

  // Fetch subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Fetch active salary scales for dynamic dropdown
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales-active'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/list');
      return res.data?.data || [];
    },
  });

  // Fetch teachers
  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers', filterType, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (search) params.append('search', search);
      const res = await api.get(`/teachers?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Add Teacher Mutation
  const addTeacherMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/teachers', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Teacher registered successfully!');
      setNewCredentials(data.credentials);
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create teacher');
    },
  });

  // Edit Teacher Mutation
  const editTeacherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/teachers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Teacher details updated successfully!');
      setEditingTeacher(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update teacher');
    },
  });

  // Delete/Deactivate Teacher Mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Teacher deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate teacher');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addTeacherMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      data[key] = value || null;
    });
    editTeacherMutation.mutate({ id: editingTeacher.id, data });
  };

  const teachers = teachersData || [];
  const rastriyaCount = teachers.filter((t: any) => t.type === 'RASTRIYA').length;
  const nijiCount = teachers.filter((t: any) => t.type === 'NIJI_SROTH').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Teachers & Staff Directory (शिक्षक तथा कर्मचारी विवरण)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकारबाट नियुक्त (स्थाई) तथा निजी स्रोत शिक्षक, प्यान नं, संचय कोष, नागरिक लगानी कोष विवरण
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Add New Teacher (शिक्षक दर्ता)</span>
        </button>
      </div>

      {/* Metric overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Total Faculty</span>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-1">{teachers.length}</p>
          <p className="text-[11px] text-gray-500">कुल शिक्षक संख्या</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Government Appointed (स्थाई)</span>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">{rastriyaCount}</p>
          <p className="text-[11px] text-gray-500">नेपाल सरकार दरबन्दी</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase">School Own Source (निजी स्रोत)</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{nijiCount}</p>
          <p className="text-[11px] text-gray-500">करार तथा निजी स्रोत</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by teacher name, PAN number, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden"
          >
            <option value="">All Types (सबै प्रकार)</option>
            <option value="RASTRIYA">Government (स्थाई)</option>
            <option value="NIJI_SROTH">Private (निजी स्रोत)</option>
          </select>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2 text-xs">Loading teachers list...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <GraduationCap size={32} className="mx-auto text-gray-300 mb-1" />
            <p className="text-sm font-semibold text-gray-600">No teachers found</p>
          </div>
        ) : (
          teachers.map((teacher: any) => (
            <div
              key={teacher.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#1e3a5f] font-extrabold text-sm">
                    {teacher.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 leading-tight">{teacher.fullName}</h3>
                    {teacher.fullNameNepali && (
                      <p className="text-[10px] text-gray-500 font-nepali">{teacher.fullNameNepali}</p>
                    )}
                    <span
                      className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        teacher.type === 'RASTRIYA'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {teacher.type === 'RASTRIYA' ? 'स्थाई (Government)' : 'निजी स्रोत (Private)'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTeacher(teacher)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition"
                    title="Edit Teacher Details (विवरण सम्पादन)"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to deactivate teacher "${teacher.fullName}"?`)) {
                        deleteTeacherMutation.mutate(teacher.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                    title="Deactivate Teacher (शिक्षक हटाउने)"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-50 pt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Post / Taha:</span>
                  <span className="font-semibold text-gray-800">{teacher.post || teacher.taha || 'Teacher'}</span>
                </div>
                {teacher.panNo && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-400 font-sans">PAN No:</span>
                    <span className="font-semibold">{teacher.panNo}</span>
                  </div>
                )}
                {teacher.sanchayaKoshNo && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-400 font-sans">Sanchaya Kosh:</span>
                    <span className="font-semibold">{teacher.sanchayaKoshNo}</span>
                  </div>
                )}
                {teacher.phone && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-400 font-sans">Phone:</span>
                    <span className="font-semibold">{teacher.phone}</span>
                  </div>
                )}
              </div>

              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="border-t border-gray-50 pt-2">
                  <span className="text-[10px] text-gray-400 block font-bold mb-1">Subjects Taught:</span>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((ts: any) => (
                      <span key={ts.subjectId} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {ts.subject?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── ADD TEACHER MODAL ─────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">Register Teacher / Staff (शिक्षक दर्ता)</h2>
                <p className="text-[11px] text-gray-500">Generates login ID for teacher portal access</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input required name="fullName" type="text" placeholder="e.g. Hari Prasad Sharma" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input name="fullNameNepali" type="text" placeholder="उदा. हरि प्रसाद शर्मा" className="erp-input font-nepali" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teacher Type *</label>
                  <select name="type" required className="erp-input font-semibold">
                    <option value="RASTRIYA">स्थाई (Government / Rastriya)</option>
                    <option value="NIJI_SROTH">निजी स्रोत (Private / Contract)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी) *</label>
                  <select name="taha" required className="erp-input font-bold text-[#1e3a5f]">
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Post / Designation</label>
                  <input name="post" type="text" placeholder="Head Teacher / Teacher / Incharge" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN Number</label>
                  <input name="panNo" type="text" placeholder="PAN 102938475" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sanchaya Kosh (SSK) No</label>
                  <input name="sanchayaKoshNo" type="text" placeholder="SSK Number" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nagarik Lagani Kosh (CIT)</label>
                  <input name="nagarikLaganiKoshNo" type="text" placeholder="CIT Number" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No) *</label>
                  <input required name="phone" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input name="email" type="email" placeholder="teacher@school.edu.np" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Joining (BS)</label>
                  <input name="dateOfJoiningBs" type="text" placeholder="2075-04-01" className="erp-input font-mono" />
                </div>
              </div>

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
                  disabled={addTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {addTeacherMutation.isPending ? 'Saving...' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT TEACHER MODAL ────────────────────────────────────────────── */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">Edit Teacher / Staff (शिक्षक विवरण सम्पादन)</h2>
                <p className="text-[11px] text-gray-500">Update personal, post, salary scale or contact details</p>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input
                    required
                    name="fullName"
                    type="text"
                    defaultValue={editingTeacher.fullName}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input
                    name="fullNameNepali"
                    type="text"
                    defaultValue={editingTeacher.fullNameNepali || ''}
                    className="erp-input font-nepali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teacher Type *</label>
                  <select
                    name="type"
                    required
                    defaultValue={editingTeacher.type}
                    className="erp-input font-semibold"
                  >
                    <option value="RASTRIYA">स्थाई (Government / Rastriya)</option>
                    <option value="NIJI_SROTH">निजी स्रोत (Private / Contract)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी) *</label>
                  <select
                    name="taha"
                    required
                    defaultValue={editingTeacher.taha || ''}
                    className="erp-input font-bold text-[#1e3a5f]"
                  >
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Post / Designation</label>
                  <input
                    name="post"
                    type="text"
                    defaultValue={editingTeacher.post || ''}
                    className="erp-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN Number</label>
                  <input
                    name="panNo"
                    type="text"
                    defaultValue={editingTeacher.panNo || ''}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sanchaya Kosh (SSK) No</label>
                  <input
                    name="sanchayaKoshNo"
                    type="text"
                    defaultValue={editingTeacher.sanchayaKoshNo || ''}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nagarik Lagani Kosh (CIT)</label>
                  <input
                    name="nagarikLaganiKoshNo"
                    type="text"
                    defaultValue={editingTeacher.nagarikLaganiKoshNo || ''}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No)</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={editingTeacher.phone || ''}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingTeacher.email || ''}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Joining (BS)</label>
                  <input
                    name="dateOfJoiningBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfJoiningBs || ''}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Address (ठेगाना)</label>
                  <input
                    name="address"
                    type="text"
                    defaultValue={editingTeacher.address || ''}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Retirement (BS)</label>
                  <input
                    name="dateOfRetirementBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfRetirementBs || ''}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {editTeacherMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREDENTIALS SUCCESS POPUP ──────────────────────────────────────── */}
      {newCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <KeyRound size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Teacher Login Credentials</h3>
              <p className="text-xs text-gray-500 mt-1">
                Please copy and share these credentials with the teacher.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-left text-xs font-mono space-y-2">
              <div>
                <span className="text-gray-400 block font-sans">Username:</span>
                <span className="font-bold text-base text-[#1e3a5f]">{newCredentials.username}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans">Temporary Password:</span>
                <span className="font-bold text-base text-emerald-700">{newCredentials.password}</span>
              </div>
            </div>

            <button
              onClick={() => setNewCredentials(null)}
              className="w-full rounded-xl bg-[#1e3a5f] py-2 text-xs font-bold text-white hover:bg-[#2a5280]"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
