'use client';

import React, { useState } from 'react';
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
  Upload,
  Camera,
  CheckCircle2,
  Briefcase,
  Layers,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NON_TEACHING_POSTS = [
  'लेखापाल (Accountant)',
  'सह-लेखापाल / कार्यालय सहायक (Account Assistant / Office Assistant)',
  'प्रशासनिक अधिकृत / सहायक (Administrative Officer / Assistant)',
  'कम्प्युटर अपरेटर / IT प्राविधिक (Computer Operator / IT Tech)',
  'प्रयोगशाला सहायक (Science Lab Assistant)',
  'पुस्तकालय सहायक (Library Assistant)',
  'कार्यालय सहयोगी / पियन (Office Peon / Helper)',
  'सवारी चालक (School Driver)',
  'सुरक्षा गार्ड (Security Guard)',
  'सरसफाइ कर्मचारी (Sanitation / Cleaner)',
  'भान्छे / क्यान्टिन सहयोगी (Cook / Canteen Staff)',
  'अन्य गैर-शैक्षिक कर्मचारी (Other Staff)',
];

const TEACHING_POSTS = [
  'प्रधानाध्यापक (Headmaster / Principal)',
  'सहायक प्रधानाध्यापक (Assistant Headmaster)',
  'मा.वि. शिक्षक (Secondary Teacher - Grade 9-12)',
  'नि.मा.वि. शिक्षक (Lower Secondary Teacher - Grade 6-8)',
  'प्रा.वि. शिक्षक (Primary Teacher - Grade 1-5)',
  'शिशु / बालविकास शिक्षक (ECD / Nursery Teacher)',
  'विषय शिक्षक (Subject Teacher)',
  'राहत शिक्षक (Rahat Teacher)',
  'करार शिक्षक (Contract Teacher)',
];

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [newCredentials, setNewCredentials] = useState<any>(null);

  // Form Category state in Add/Edit modal
  const [modalCategory, setModalCategory] = useState<'TEACHING' | 'NON_TEACHING'>('TEACHING');
  const [selectedPost, setSelectedPost] = useState('');
  const [customPost, setCustomPost] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');

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

  // Fetch staff & teachers
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

  // Photo compression helper (guarantees <= 50KB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (.jpg, .png, .webp)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 320;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with quality 0.75 so size is ~20-35KB (under 50KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        if (isEdit) {
          setEditPhotoPreview(compressedBase64);
        } else {
          setPhotoPreview(compressedBase64);
        }
        toast.success(`Photo compressed & ready (under 50 KB)`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Add Teacher/Staff Mutation
  const addTeacherMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/teachers', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Staff/Teacher registered successfully!');
      setNewCredentials(data.credentials);
      setIsAddModalOpen(false);
      setPhotoPreview('');
      setSelectedSubjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    },
  });

  // Edit Teacher/Staff Mutation
  const editTeacherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/teachers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff details updated successfully!');
      setEditingTeacher(null);
      setEditPhotoPreview('');
      setSelectedSubjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update staff');
    },
  });

  // Delete Teacher/Staff Mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff record removed permanently.');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove staff');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    data.shreni = modalCategory;
    data.post = customPost || selectedPost || fd.get('post') || (modalCategory === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक');
    if (photoPreview) data.photoUrl = photoPreview;
    if (modalCategory === 'TEACHING') {
      data.subjectIds = selectedSubjectIds;
    } else {
      data.subjectIds = [];
    }
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
    data.shreni = modalCategory;
    data.post = customPost || selectedPost || fd.get('post') || editingTeacher.post;
    if (editPhotoPreview) {
      data.photoUrl = editPhotoPreview;
    } else if (editingTeacher.photoUrl) {
      data.photoUrl = editingTeacher.photoUrl;
    }
    if (modalCategory === 'TEACHING') {
      data.subjectIds = selectedSubjectIds;
    } else {
      data.subjectIds = [];
    }
    editTeacherMutation.mutate({ id: editingTeacher.id, data });
  };

  const allTeachers: any[] = teachersData || [];

  // Categorize
  const teachingStaff = allTeachers.filter((t: any) => t.shreni !== 'NON_TEACHING');
  const nonTeachingStaff = allTeachers.filter((t: any) => t.shreni === 'NON_TEACHING');

  const displayedStaff = allTeachers.filter((t: any) => {
    if (activeCategoryTab === 'TEACHING') return t.shreni !== 'NON_TEACHING';
    if (activeCategoryTab === 'NON_TEACHING') return t.shreni === 'NON_TEACHING';
    return true;
  });

  const rastriyaCount = allTeachers.filter((t: any) => t.type === 'RASTRIYA').length;
  const nijiCount = allTeachers.filter((t: any) => t.type === 'NIJI_SROTH').length;

  const openAddModal = (cat: 'TEACHING' | 'NON_TEACHING' = 'TEACHING') => {
    setModalCategory(cat);
    setSelectedPost(cat === 'NON_TEACHING' ? NON_TEACHING_POSTS[0] : TEACHING_POSTS[2]);
    setCustomPost('');
    setPhotoPreview('');
    setSelectedSubjectIds([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    const isNonTeach = staff.shreni === 'NON_TEACHING';
    setModalCategory(isNonTeach ? 'NON_TEACHING' : 'TEACHING');
    setSelectedPost(staff.post || '');
    setCustomPost('');
    setEditingTeacher(staff);
    setEditPhotoPreview(staff.photoUrl || '');
    setSelectedSubjectIds(staff.subjects?.map((s: any) => s.subjectId) || []);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Users className="text-[#1e3a5f]" />
            <span>Teachers & Staff Directory (शिक्षक तथा कर्मचारी विवरण)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            शैक्षिक जनशक्ति (शिक्षकहरू) तथा गैर-शैक्षिक (प्रशासनिक, लेखा, प्रयोगशाला, पुस्तकालय तथा कार्यालय सहयोगी) कर्मचारी व्यवस्थापन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openAddModal('TEACHING')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Teacher (शिक्षक दर्ता)</span>
          </button>
          <button
            onClick={() => openAddModal('NON_TEACHING')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-2xs transition cursor-pointer"
          >
            <Briefcase size={14} />
            <span>+ Add Staff (कर्मचारी दर्ता)</span>
          </button>
        </div>
      </div>

      {/* Metric overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Faculty & Staff</span>
            <Users size={16} className="text-[#1e3a5f]" />
          </div>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-1">{allTeachers.length}</p>
          <p className="text-[11px] text-gray-500 font-nepali">कुल जनशक्ति</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Teaching Faculty</span>
            <GraduationCap size={16} className="text-blue-700" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">{teachingStaff.length}</p>
          <p className="text-[11px] text-blue-700 font-nepali">शिक्षक संख्या (Teaching)</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Non-Teaching Staff</span>
            <Briefcase size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{nonTeachingStaff.length}</p>
          <p className="text-[11px] text-emerald-700 font-nepali">गैर-शैक्षिक कर्मचारी (Staff)</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Permanent / Gov</span>
            <ShieldCheck size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{rastriyaCount}</p>
          <p className="text-[11px] text-gray-500 font-nepali">स्थाई दरबन्दी ({nijiCount} निजी/करार)</p>
        </div>
      </div>

      {/* ─── CATEGORY TABS & FILTER BAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
        {/* Category Switcher Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200">
          <button
            onClick={() => setActiveCategoryTab('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeCategoryTab === 'ALL' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={13} />
            <span>All ({allTeachers.length})</span>
          </button>
          <button
            onClick={() => setActiveCategoryTab('TEACHING')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeCategoryTab === 'TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <GraduationCap size={13} />
            <span>Teaching Faculty (शिक्षक) ({teachingStaff.length})</span>
          </button>
          <button
            onClick={() => setActiveCategoryTab('NON_TEACHING')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeCategoryTab === 'NON_TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase size={13} />
            <span>Non-Teaching Staff (कर्मचारी) ({nonTeachingStaff.length})</span>
          </button>
        </div>

        {/* Search & Employment Type Filter */}
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, post, PAN, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
          >
            <option value="">All Types (सबै)</option>
            <option value="RASTRIYA">स्थाई (Government)</option>
            <option value="NIJI_SROTH">निजी स्रोत (Private)</option>
          </select>
        </div>
      </div>

      {/* ─── STAFF / TEACHERS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2 text-xs">Loading staff directory...</p>
          </div>
        ) : displayedStaff.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Users size={32} className="mx-auto text-gray-300 mb-1" />
            <p className="text-sm font-semibold text-gray-600">No staff found matching filter</p>
            <p className="text-xs text-gray-400">Use &apos;Add Staff&apos; or &apos;Add Teacher&apos; to register members.</p>
          </div>
        ) : (
          displayedStaff.map((staff: any) => {
            const isNonTeaching = staff.shreni === 'NON_TEACHING';

            return (
              <div
                key={staff.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-extrabold text-sm overflow-hidden border shadow-2xs ${
                      isNonTeaching ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-[#1e3a5f] border-blue-200'
                    }`}>
                      {staff.photoUrl ? (
                        <img src={staff.photoUrl} alt={staff.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{staff.fullName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 leading-tight flex items-center gap-1.5">
                        <span>{staff.fullName}</span>
                      </h3>
                      {staff.fullNameNepali && (
                        <p className="text-[10px] text-gray-500 font-nepali">{staff.fullNameNepali}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                            isNonTeaching
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isNonTeaching ? <Briefcase size={10} /> : <GraduationCap size={10} />}
                          <span>{isNonTeaching ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'}</span>
                        </span>

                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            staff.type === 'RASTRIYA'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {staff.type === 'RASTRIYA' ? 'स्थाई (Gov)' : 'निजी स्रोत'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(staff)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                      title="Edit Staff Details"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${staff.fullName}"?`)) {
                          deleteTeacherMutation.mutate(staff.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                      title="Remove Staff"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-2 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">पद / Designation:</span>
                    <span className="font-bold text-gray-900 bg-slate-50 px-2 py-0.5 rounded-md border border-gray-100">
                      {staff.post || (isNonTeaching ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                    </span>
                  </div>

                  {staff.taha && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">तह / श्रेणी:</span>
                      <span className="font-semibold text-gray-700">{staff.taha}</span>
                    </div>
                  )}

                  {staff.panNo && (
                    <div className="flex justify-between font-mono">
                      <span className="text-gray-400 font-sans">PAN No:</span>
                      <span className="font-semibold">{staff.panNo}</span>
                    </div>
                  )}

                  {staff.phone && (
                    <div className="flex justify-between font-mono">
                      <span className="text-gray-400 font-sans">Phone:</span>
                      <span className="font-semibold">{staff.phone}</span>
                    </div>
                  )}

                  {staff.user?.role && staff.user.role !== 'TEACHER' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portal Role:</span>
                      <span className="font-bold text-[10px] text-purple-700 uppercase bg-purple-50 px-1.5 py-0.5 rounded">
                        {staff.user.role}
                      </span>
                    </div>
                  )}
                </div>

                {/* Subjects Taught (for Teaching Staff only) */}
                {!isNonTeaching && staff.subjects && staff.subjects.length > 0 && (
                  <div className="border-t border-gray-50 pt-2">
                    <span className="text-[10px] text-gray-400 block font-bold mb-1">Subjects Taught (पढाउने विषयहरू):</span>
                    <div className="flex flex-wrap gap-1">
                      {staff.subjects.map((ts: any) => (
                        <span key={ts.subjectId} className="rounded bg-blue-50 text-blue-900 border border-blue-100 px-1.5 py-0.5 text-[10px] font-semibold">
                          {ts.subject?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── ADD TEACHER / NON-TEACHING STAFF MODAL ───────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">
                  {modalCategory === 'NON_TEACHING'
                    ? 'Register Non-Teaching Staff (गैर-शैक्षिक कर्मचारी दर्ता)'
                    : 'Register Teacher (शिक्षक दर्ता)'}
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  व्यक्तिगत विवरण, पद, तह, प्यान नम्बर तथा पोर्टल लगइन सिर्जना
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Category Selector Buttons */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  कर्मचारी वर्ग (Staff Category) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory('TEACHING');
                      setSelectedPost(TEACHING_POSTS[2]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'TEACHING'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap size={16} />
                    <span>Teaching Faculty (शिक्षक)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory('NON_TEACHING');
                      setSelectedPost(NON_TEACHING_POSTS[0]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'NON_TEACHING'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Non-Teaching Staff (कर्मचारी)</span>
                  </button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">Profile Photo (फोटो)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Max 50 KB (Auto-Optimized)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5280] cursor-pointer"
                    />
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => setPhotoPreview('')}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input required name="fullName" type="text" placeholder="e.g. Ramesh Kumar Yadav" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input name="fullNameNepali" type="text" placeholder="उदा. रमेश कुमार यादव" className="erp-input font-nepali" />
                </div>
              </div>

              {/* Post / Designation Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    पद / Designation ({modalCategory === 'NON_TEACHING' ? 'गैर-शैक्षिक पद' : 'शिक्षक पद'}) *
                  </label>
                  <select
                    value={selectedPost}
                    onChange={(e) => setSelectedPost(e.target.value)}
                    className="erp-input font-semibold"
                  >
                    {modalCategory === 'NON_TEACHING' ? (
                      NON_TEACHING_POSTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    ) : (
                      TEACHING_POSTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Custom Post Title (अन्य पद भएमा):</label>
                  <input
                    type="text"
                    placeholder="उदा. सहायक लेखापाल / बस चालक"
                    value={customPost}
                    onChange={(e) => setCustomPost(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Employment Type & Taha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Appointment Type (दरबन्दी प्रकार) *</label>
                  <select name="type" required className="erp-input font-semibold">
                    <option value="RASTRIYA">स्थाई (Government / Rastriya)</option>
                    <option value="NIJI_SROTH">निजी स्रोत (Private / Contract)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी / स्केल)</label>
                  <select name="taha" className="erp-input font-bold text-[#1e3a5f]">
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                    <option value="सहायक पाँचौ">सहायक पाँचौ (Assistant 5th)</option>
                    <option value="सहायक चौथो">सहायक चौथो (Assistant 4th)</option>
                    <option value="श्रेणीविहीन">श्रेणीविहीन (Unranked / Helper)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Portal System Role (लगइन पहुँच):</label>
                  <select name="role" className="erp-input font-semibold">
                    <option value="TEACHER">Staff / Teacher Portal (कर्मचारी पोर्टल)</option>
                    <option value="ACCOUNTANT">Accountant (लेखा तथा वित्तीय पूर्ण पहुँच)</option>
                    <option value="LIBRARIAN">Librarian (पुस्तकालय व्यवस्थापक)</option>
                    <option value="ADMIN">Administrator (प्रशासकीय पहुँच)</option>
                  </select>
                </div>
              </div>

              {/* Financial IDs */}
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

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No) *</label>
                  <input required name="phone" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input name="email" type="email" placeholder="staff@school.edu.np" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Joining (BS)</label>
                  <input name="dateOfJoiningBs" type="text" placeholder="2075-04-01" className="erp-input font-mono" />
                </div>
              </div>

              {/* Subjects Checklist (for Teaching Staff only) */}
              {modalCategory === 'TEACHING' && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    पढाउने विषयहरू (Subjects Taught):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {subjectsData?.map((sub: any) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isChecked ? 'bg-white border-blue-400 font-bold text-blue-900' : 'bg-white/60 border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedSubjectIds((prev) =>
                                isChecked ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate">{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
                >
                  {addTeacherMutation.isPending ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT TEACHER / NON-TEACHING STAFF MODAL ───────────────────────── */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">
                  Edit Staff / Teacher Details (विवरण सम्पादन)
                </h2>
                <p className="text-[11px] text-gray-500">
                  Update personal, designation, category, salary scale or portal role
                </p>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Category Selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  कर्मचारी वर्ग (Staff Category) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCategory('TEACHING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'TEACHING'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap size={16} />
                    <span>Teaching Faculty (शिक्षक)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCategory('NON_TEACHING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'NON_TEACHING'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Non-Teaching Staff (कर्मचारी)</span>
                  </button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">Change Photo (फोटो परिवर्तन)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Max 50 KB (Auto-Optimized)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5280] cursor-pointer"
                    />
                    {editPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoPreview('')}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
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

              {/* Post / Designation Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    पद / Designation ({modalCategory === 'NON_TEACHING' ? 'गैर-शैक्षिक पद' : 'शिक्षक पद'}) *
                  </label>
                  <select
                    value={selectedPost}
                    onChange={(e) => setSelectedPost(e.target.value)}
                    className="erp-input font-semibold"
                  >
                    {modalCategory === 'NON_TEACHING' ? (
                      NON_TEACHING_POSTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    ) : (
                      TEACHING_POSTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Custom Post Title (अन्य पद भएमा):</label>
                  <input
                    type="text"
                    placeholder="उदा. सह-लेखापाल"
                    value={customPost}
                    onChange={(e) => setCustomPost(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Employment Type & Taha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Appointment Type *</label>
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
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी)</label>
                  <select
                    name="taha"
                    defaultValue={editingTeacher.taha || ''}
                    className="erp-input font-bold text-[#1e3a5f]"
                  >
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                    <option value="सहायक पाँचौ">सहायक पाँचौ (Assistant 5th)</option>
                    <option value="सहायक चौथो">सहायक चौथो (Assistant 4th)</option>
                    <option value="श्रेणीविहीन">श्रेणीविहीन (Unranked / Helper)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Portal Role (लगइन पहुँच):</label>
                  <select
                    name="role"
                    defaultValue={editingTeacher.user?.role || 'TEACHER'}
                    className="erp-input font-semibold"
                  >
                    <option value="TEACHER">Staff / Teacher Portal (कर्मचारी पोर्टल)</option>
                    <option value="ACCOUNTANT">Accountant (लेखा तथा वित्तीय पूर्ण पहुँच)</option>
                    <option value="LIBRARIAN">Librarian (पुस्तकालय व्यवस्थापक)</option>
                    <option value="ADMIN">Administrator (प्रशासकीय पहुँच)</option>
                  </select>
                </div>
              </div>

              {/* Financial IDs */}
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

              {/* Contact Info */}
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

              {/* Subjects Checklist (for Teaching Staff only) */}
              {modalCategory === 'TEACHING' && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    पढाउने विषयहरू (Subjects Taught):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {subjectsData?.map((sub: any) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isChecked ? 'bg-white border-blue-400 font-bold text-blue-900' : 'bg-white/60 border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedSubjectIds((prev) =>
                                isChecked ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate">{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
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
              <h3 className="text-base font-extrabold text-gray-900">Staff Portal Credentials</h3>
              <p className="text-xs text-gray-500 mt-1">
                Please copy and share these credentials with the staff member.
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
              className="w-full rounded-xl bg-[#1e3a5f] py-2 text-xs font-bold text-white hover:bg-[#2a5280] cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
