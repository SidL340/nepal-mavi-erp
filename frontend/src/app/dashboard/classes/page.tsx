'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  School,
  Plus,
  BookOpen,
  Users,
  GraduationCap,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  Search,
  Filter,
  UserCheck,
  Settings2,
  Clock,
  List,
  LayoutGrid,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClassRoutineView from '@/components/classes/ClassRoutineView';

export default function ClassesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      router.replace('/teacher');
    } else if (user?.role === 'STUDENT') {
      router.replace('/student');
    }
  }, [user, router]);

  const queryClient = useQueryClient();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'routine'>(
    tabParam === 'routine' ? 'routine' : tabParam === 'subjects' ? 'subjects' : 'classes'
  );

  useEffect(() => {
    if (tabParam === 'routine') setActiveTab('routine');
    else if (tabParam === 'subjects') setActiveTab('subjects');
  }, [tabParam]);
  
  // Classes View Mode & Search State (default to 'list' view as requested)
  const [classViewMode, setClassViewMode] = useState<'list' | 'grid'>('list');
  const [classSearch, setClassSearch] = useState('');

  // Modals
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState<any>(null);
  
  // Class subject individual add state
  const [addSubjectToClassId, setAddSubjectToClassId] = useState('');
  const [addSubjectTeacherId, setAddSubjectTeacherId] = useState('');

  // Subject level filter
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [subjectSearch, setSubjectSearch] = useState('');

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Fetch Teachers
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // Fetch Classes
  const { data: classesData, isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Subjects
  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Fetch Subject Presets
  const { data: presetsData } = useQuery({
    queryKey: ['subject-presets'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/presets');
      return res.data?.data || {};
    },
  });

  // Fetch single class detail when selected
  const { data: classDetailData, refetch: refetchClassDetail } = useQuery({
    queryKey: ['class-detail', selectedClassDetail?.id],
    queryFn: async () => {
      if (!selectedClassDetail?.id) return null;
      const res = await api.get(`/classes/${selectedClassDetail.id}`);
      return res.data?.data;
    },
    enabled: !!selectedClassDetail?.id,
  });

  // Add Class Mutation
  const addClassMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/classes', {
        ...formData,
        academicYearId: activeYear?.id || 1,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Class created successfully!');
      setIsAddClassModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create class');
    },
  });

  // Edit Class Mutation
  const editClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/classes/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Class details updated successfully!');
      setIsEditClassModalOpen(false);
      setEditingClass(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      refetchClassDetail();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update class');
    },
  });

  // Delete Class Mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/classes/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Class deleted successfully.');
      if (selectedClassDetail?.id) setSelectedClassDetail(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete class');
    },
  });

  // Add Subject Mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/classes/subjects', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject added to catalog!');
      setIsAddSubjectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['subjects-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add subject');
    },
  });

  // Edit Subject Mutation
  const editSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/classes/subjects/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject updated successfully!');
      setIsEditSubjectModalOpen(false);
      setEditingSubject(null);
      queryClient.invalidateQueries({ queryKey: ['subjects-all'] });
      refetchClassDetail();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update subject');
    },
  });

  // Delete Subject from Catalog Mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      const res = await api.delete(`/classes/subjects/${subjectId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject deleted from catalog.');
      queryClient.invalidateQueries({ queryKey: ['subjects-all'] });
      refetchClassDetail();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
    },
  });

  // Apply Preset Mutation to a Class
  const applyPresetMutation = useMutation({
    mutationFn: async ({ classId, presetKey }: { classId: number; presetKey: string }) => {
      const res = await api.post(`/classes/${classId}/subjects/apply-preset`, { presetKey });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Curriculum preset subjects assigned!');
      refetchClassDetail();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['subjects-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to apply preset');
    },
  });

  // Add Individual Subject to Class Mutation
  const addSingleSubjectToClassMutation = useMutation({
    mutationFn: async ({ classId, subjectId, teacherId }: { classId: number; subjectId: number; teacherId?: number | null }) => {
      const res = await api.post(`/classes/${classId}/subjects/add-single`, { subjectId, teacherId });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject added to class!');
      setAddSubjectToClassId('');
      setAddSubjectTeacherId('');
      refetchClassDetail();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add subject');
    },
  });

  // Remove Subject from Class Mutation
  const removeSubjectFromClassMutation = useMutation({
    mutationFn: async ({ classId, subjectId }: { classId: number; subjectId: number }) => {
      const res = await api.delete(`/classes/${classId}/subjects/${subjectId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject removed from class.');
      refetchClassDetail();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove subject');
    },
  });

  // Update Class Subject Teacher Mutation
  const updateSubjectTeacherMutation = useMutation({
    mutationFn: async ({ classId, subjectId, teacherId }: { classId: number; subjectId: number; teacherId: number | null }) => {
      const res = await api.patch(`/classes/${classId}/subjects/${subjectId}/teacher`, { teacherId });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subject teacher updated!');
      refetchClassDetail();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update teacher');
    },
  });

  const handleAddClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addClassMutation.mutate(data);
  };

  const handleEditClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClass) return;
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get('name'),
      nameNepali: fd.get('nameNepali') || null,
      section: fd.get('section') || null,
      classTeacherId: fd.get('classTeacherId') ? parseInt(String(fd.get('classTeacherId'))) : null,
      orderIndex: fd.get('orderIndex') ? parseInt(String(fd.get('orderIndex'))) : 0,
    };
    editClassMutation.mutate({ id: editingClass.id, data });
  };

  const handleAddSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      isElective: fd.get('isElective') === 'on',
    };
    fd.forEach((value, key) => {
      if (value && key !== 'isElective') data[key] = value;
    });
    addSubjectMutation.mutate(data);
  };

  const handleEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSubject) return;
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get('name'),
      nameNepali: fd.get('nameNepali'),
      code: fd.get('code'),
      isElective: fd.get('isElective') === 'on',
    };
    editSubjectMutation.mutate({ id: editingSubject.id, data });
  };

  const getClassRank = (name: string) => {
    if (!name) return 999;
    const lower = name.toLowerCase().trim();
    if (lower.includes('play') || lower.includes('pg')) return -4;
    if (lower.includes('nursery') || lower.includes('shishu') || lower.includes('ecd') || lower.includes('ppc')) return -3;
    if (lower.includes('lkg') || lower.includes('lower kg') || lower.includes('kg 1')) return -2;
    if (lower.includes('ukg') || lower.includes('upper kg') || lower.includes('kg 2') || lower.includes('kg')) return -1;
    const match = name.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 100;
  };

  const rawClasses = classesData || [];
  const classes = [...rawClasses].sort((a: any, b: any) => {
    const rankA = a.orderIndex !== 0 && a.orderIndex !== undefined ? a.orderIndex : getClassRank(a.name);
    const rankB = b.orderIndex !== 0 && b.orderIndex !== undefined ? b.orderIndex : getClassRank(b.name);
    if (rankA !== rankB) return rankA - rankB;
    return (a.section || '').localeCompare(b.section || '');
  });

  const totalEnrolledStudents = classes.reduce((sum: number, cls: any) => sum + (cls._count?.enrollments || 0), 0);

  // Filter classes in Tab 1
  const filteredClasses = classes.filter((cls: any) => {
    if (!classSearch.trim()) return true;
    const q = classSearch.toLowerCase().trim();
    const nameMatch = (cls.name || '').toLowerCase().includes(q);
    const secMatch = (cls.section || '').toLowerCase().includes(q);
    const teacherMatch = (cls.classTeacher?.fullName || '').toLowerCase().includes(q);
    const yearMatch = (cls.academicYear?.year || '').toLowerCase().includes(q);
    return nameMatch || secMatch || teacherMatch || yearMatch;
  });

  const subjects = subjectsData || [];
  const presets = presetsData || {};

  // Filter subjects in Tab 2
  const filteredSubjects = subjects.filter((s: any) => {
    const matchesSearch =
      !subjectSearch ||
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      (s.nameNepali && s.nameNepali.includes(subjectSearch)) ||
      (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (subjectFilter === 'ALL') return true;
    if (subjectFilter === 'ECD') return s.code?.startsWith('ECD');
    if (subjectFilter === 'PRIMARY_1_3') return s.code?.includes('-101');
    if (subjectFilter === 'PRIMARY_4_5') return s.code?.includes('-401');
    if (subjectFilter === 'BASIC_6_8') return s.code?.includes('-601') || s.code === 'MOR-601';
    if (subjectFilter === 'SECONDARY_9_10') return s.code?.startsWith('NEP-001') || s.code?.startsWith('OPT-') || s.code?.includes('002') || s.code?.includes('003') || s.code?.includes('004') || s.code?.includes('005');
    if (subjectFilter === 'HIGHER_11_12') return s.code?.includes('11') || s.code?.includes('101') || s.code?.includes('102') || s.code?.includes('201') || s.code?.includes('301');
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <School className="text-[#1e3a5f]" />
            <span>Classes, Subjects & Routine (कक्षा, विषय तथा दैनिक रुटिन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            प्रारम्भिक बालविकास देखि कक्षा १२ सम्मको कक्षा सिर्जना, विषय सूची, र घण्टी तथा विश्राम समय सहितको दैनिक रुटिन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'classes' && (
            <button
              onClick={() => setIsAddClassModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Class (कक्षा थप्नुहोस्)</span>
            </button>
          )}
          {activeTab === 'subjects' && (
            <button
              onClick={() => setIsAddSubjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Custom Subject (विषय थप्नुहोस्)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap rounded-xl bg-slate-200/70 p-1 text-xs font-bold w-fit gap-1">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition cursor-pointer ${
            activeTab === 'classes' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <School size={14} />
          <span>Classes & Sections ({classes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition cursor-pointer ${
            activeTab === 'subjects' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen size={14} />
          <span>Subject Catalog ({subjects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('routine')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition cursor-pointer ${
            activeTab === 'routine' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock size={14} />
          <span>Class Routine & Timetable (दैनिक रुटिन)</span>
        </button>
      </div>

      {/* ─── TAB 1: CLASSES VIEW (LIST / GRID TOGGLE) ───────────────────────── */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & List/Grid View Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-2xs">
            <div className="relative flex-1 w-full max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="कक्षा, सेक्सन वा कक्षा शिक्षक खोज्नुहोस्..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="erp-input pl-10 text-xs"
              />
              {classSearch && (
                <button
                  type="button"
                  onClick={() => setClassSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Summary Stats */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                  कुल कक्षा: <strong>{filteredClasses.length}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold">
                  कुल विद्यार्थी: <strong>{totalEnrolledStudents} जना</strong>
                </span>
              </div>

              {/* View Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setClassViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    classViewMode === 'list'
                      ? 'bg-white text-[#1e3a5f] shadow-xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="List / Table View"
                >
                  <List size={14} />
                  <span>List (सूची)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClassViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    classViewMode === 'grid'
                      ? 'bg-white text-[#1e3a5f] shadow-xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={14} />
                  <span>Grid (ग्रिड)</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIST VIEW (सूची / तालिका ढाँचा) */}
          {classViewMode === 'list' ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="p-3.5 font-bold uppercase w-12 text-center">#</th>
                      <th className="p-3.5 font-bold uppercase">कक्षा तथा सेक्सन (Class & Section)</th>
                      <th className="p-3.5 font-bold uppercase text-center">विद्यार्थी संख्या (Students)</th>
                      <th className="p-3.5 font-bold uppercase">मुख्य कक्षा शिक्षक (Class Teacher)</th>
                      <th className="p-3.5 font-bold uppercase text-center">शैक्षिक सत्र (Academic Year)</th>
                      <th className="p-3.5 font-bold uppercase">विषय तथा शिक्षक व्यवस्थापन (Subjects & Routine)</th>
                      <th className="p-3.5 font-bold uppercase text-right">कार्यहरू (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isClassesLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">Loading classes...</td>
                      </tr>
                    ) : filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          {classSearch ? 'खोजिएको नाम अनुसार कुनै कक्षा भेटिएन।' : 'कुनै कक्षा सिर्जना गरिएको छैन।'}
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((cls: any, idx: number) => (
                        <tr
                          key={cls.id}
                          className="hover:bg-blue-50/40 transition group"
                        >
                          <td className="p-3.5 font-mono text-gray-400 text-center font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 font-extrabold shadow-2xs group-hover:scale-105 transition">
                                <School size={16} />
                              </div>
                              <div>
                                <div
                                  onClick={() => setSelectedClassDetail(cls)}
                                  className="font-extrabold text-sm text-gray-900 hover:text-blue-700 cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{cls.name}</span>
                                </div>
                                {cls.section ? (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 border border-slate-200">
                                    Section {cls.section}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400">All Sections</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-black text-[#1e3a5f] shadow-2xs">
                              <Users size={12} className="text-blue-600" />
                              <span>{cls._count?.enrollments || 0} Students</span>
                            </span>
                          </td>
                          <td className="p-3.5">
                            {cls.classTeacher?.fullName ? (
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                  👨‍🏫
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{cls.classTeacher.fullName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{cls.classTeacher.phone || 'Class Teacher'}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                तोकिएको छैन (Not Assigned)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 text-xs border border-slate-200">
                              {cls.academicYear?.year || activeYear?.year || '2083-84'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => setSelectedClassDetail(cls)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-900 transition shadow-2xs active:scale-95 cursor-pointer"
                              title="विषयहरू, शिक्षक तथा रुटिन व्यवस्थापन गर्नुहोस्"
                            >
                              <BookOpen size={13} className="text-blue-700" />
                              <span>Manage Subjects & Teacher Assignment</span>
                              <ArrowRight size={12} className="text-blue-600" />
                            </button>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClass(cls);
                                  setIsEditClassModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Edit Class Details"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${cls.name}"? All student enrollments and subject links for this class will be removed.`)) {
                                    deleteClassMutation.mutate(cls.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Class"
                              >
                                <Trash2 size={15} />
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
          ) : (
            /* GRID CARDS VIEW (ग्रिड कार्ड ढाँचा) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isClassesLoading ? (
                <div className="col-span-full py-12 text-center text-gray-400">Loading classes...</div>
              ) : filteredClasses.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <School size={32} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-sm font-semibold text-gray-600">No classes created yet</p>
                  <p className="text-xs text-gray-400">Click &apos;Create Class&apos; to set up classes for this year.</p>
                </div>
              ) : (
                filteredClasses.map((cls: any) => (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassDetail(cls)}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3 cursor-pointer group relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 group-hover:scale-105 transition">
                          <School size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900">{cls.name}</h3>
                          {cls.section && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              Section {cls.section}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-[#1e3a5f]">
                          {cls._count?.enrollments || 0} Students
                        </span>

                        {/* Quick Edit & Delete Class */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClass(cls);
                            setIsEditClassModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Edit Class Details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${cls.name}"? All student enrollments and subject links for this class will be removed.`)) {
                              deleteClassMutation.mutate(cls.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                          title="Delete Class"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-2 text-xs space-y-1 text-gray-600">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-semibold">मुख्य कक्षा शिक्षक:</span>
                        <span className="font-bold text-[#1e3a5f]">
                          {cls.classTeacher?.fullName ? `👨‍🏫 ${cls.classTeacher.fullName}` : 'तोकिएको छैन'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Academic Year:</span>
                        <span className="font-mono">{cls.academicYear?.year || activeYear?.year || '2083-84'}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-2 flex items-center justify-between text-[11px] font-bold text-blue-600">
                      <span>Manage Subjects & Teacher Assignment</span>
                      <span>→</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: NEPAL CURRICULUM SUBJECTS TABLE ───────────────────────── */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subject by English name, Nepali name, or code..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="erp-input pl-10"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="erp-input font-bold text-xs max-w-xs"
            >
              <option value="ALL">All Levels (सबै तहका विषयहरू)</option>
              <option value="ECD">प्रारम्भिक बालविकास (ECD / Nursery / KG)</option>
              <option value="PRIMARY_1_3">कक्षा १ - ३ (Integrated Curriculum)</option>
              <option value="PRIMARY_4_5">कक्षा ४ - ५ (Primary)</option>
              <option value="BASIC_6_8">कक्षा ६ - ८ (आधारभूत तह / BLE)</option>
              <option value="SECONDARY_9_10">कक्षा ९ - १० (माध्यमिक तह / SEE)</option>
              <option value="HIGHER_11_12">कक्षा ११ - १२ (NEB Science / Mgmt)</option>
            </select>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase w-12">#</th>
                  <th className="p-3.5 font-bold uppercase">Subject Code</th>
                  <th className="p-3.5 font-bold uppercase">Subject Name (English)</th>
                  <th className="p-3.5 font-bold uppercase">Subject Name (नेपाली)</th>
                  <th className="p-3.5 font-bold uppercase">Type</th>
                  <th className="p-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isSubjectsLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading curriculum subjects...</td></tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">No subjects matching filter.</td></tr>
                ) : (
                  filteredSubjects.map((sub: any, idx: number) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-gray-400 text-center">{idx + 1}</td>
                      <td className="p-3.5 font-mono font-extrabold text-[#1e3a5f]">{sub.code || '—'}</td>
                      <td className="p-3.5 font-bold text-gray-900">{sub.name}</td>
                      <td className="p-3.5 font-nepali font-semibold text-gray-700">{sub.nameNepali || '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${
                            sub.isElective ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {sub.isElective ? 'ऐच्छिक (Elective)' : 'अनिवार्य (Compulsory)'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingSubject(sub);
                              setIsEditSubjectModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Edit Subject"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${sub.name}" from the subject catalog?`)) {
                                deleteSubjectMutation.mutate(sub.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                            title="Delete Subject"
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
      )}

      {/* ─── TAB 3: CLASS ROUTINE & TIMETABLE (दैनिक रुटिन र समय तालिका) ─── */}
      {activeTab === 'routine' && (
        <ClassRoutineView />
      )}

      {/* ─── CLASS DETAIL & SUBJECT CUSTOMIZER MODAL ───────────────────────── */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <School className="text-blue-600" size={18} />
                  <span>
                    {selectedClassDetail.name} {selectedClassDetail.section ? `(Section ${selectedClassDetail.section})` : ''} - Subjects & Teachers
                  </span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  यस कक्षामा पढाइने विषयहरू छान्नुहोस्, नपढाइने विषय हटाउनुहोस् र शिक्षक तोक्नुहोस्
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(selectedClassDetail);
                    setIsEditClassModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-bold flex items-center gap-1 border border-blue-100"
                  title="Modify Class Details"
                >
                  <Edit2 size={13} />
                  <span>Edit Class</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${selectedClassDetail.name}"? This action cannot be undone.`)) {
                      deleteClassMutation.mutate(selectedClassDetail.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 border border-rose-100"
                  title="Delete Class"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button onClick={() => setSelectedClassDetail(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 1-Click Curriculum Presets */}
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 border border-blue-100 space-y-2">
              <span className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>1-Click Load Standard Presets (पाठ्यक्रम अनुसार लोड गर्नुहोस्):</span>
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(presets).map(([key, val]: [string, any]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={applyPresetMutation.isPending}
                    onClick={() => applyPresetMutation.mutate({ classId: selectedClassDetail.id, presetKey: key })}
                    className="p-2 text-left rounded-lg bg-white border border-blue-200 hover:border-[#1e3a5f] hover:shadow-xs transition text-xs font-bold text-gray-800 flex justify-between items-center"
                  >
                    <span className="truncate mr-1">{val.label}</span>
                    <span className="text-[10px] text-blue-600 font-mono shrink-0">Load →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Individual Subject to this Class */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-600" />
                <span>Add Individual Subject to this Class (नयाँ विषय थप्नुहोस्):</span>
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                <select
                  value={addSubjectToClassId}
                  onChange={(e) => setAddSubjectToClassId(e.target.value)}
                  className="erp-input flex-1 font-semibold text-xs"
                >
                  <option value="">Select Subject from Catalog...</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.nameNepali ? `(${sub.nameNepali})` : ''} [{sub.code}]
                    </option>
                  ))}
                </select>

                <select
                  value={addSubjectTeacherId}
                  onChange={(e) => setAddSubjectTeacherId(e.target.value)}
                  className="erp-input flex-1 font-semibold text-xs"
                >
                  <option value="">Assign Subject Teacher (Optional)...</option>
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!addSubjectToClassId || addSingleSubjectToClassMutation.isPending}
                  onClick={() =>
                    addSingleSubjectToClassMutation.mutate({
                      classId: selectedClassDetail.id,
                      subjectId: parseInt(addSubjectToClassId),
                      teacherId: addSubjectTeacherId ? parseInt(addSubjectTeacherId) : null,
                    })
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                >
                  + Add to Class
                </button>
              </div>
            </div>

            {/* Current Assigned Subjects List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Currently Assigned Subjects ({classDetailData?.subjects?.length || 0})
                </h3>
                <span className="text-[10px] text-gray-500">
                  Tip: You can change teacher or remove subjects not taught in this class.
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {classDetailData?.subjects?.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                    No subjects assigned yet. Select a preset above or add individual subjects!
                  </div>
                ) : (
                  classDetailData?.subjects?.map((cs: any) => (
                    <div
                      key={cs.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-300 shadow-2xs gap-2 text-xs"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900">{cs.subject?.name}</span>
                          {cs.subject?.nameNepali && (
                            <span className="text-gray-500 font-nepali">({cs.subject?.nameNepali})</span>
                          )}
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {cs.subject?.code}
                          </span>
                        </div>
                      </div>

                      {/* Teacher Dropdown */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <UserCheck size={13} className="text-gray-400" />
                          <select
                            value={cs.teacherId || ''}
                            onChange={(e) =>
                              updateSubjectTeacherMutation.mutate({
                                classId: selectedClassDetail.id,
                                subjectId: cs.subjectId,
                                teacherId: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="rounded-lg border border-gray-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-gray-700 focus:bg-white"
                          >
                            <option value="">No Teacher Assigned</option>
                            {teachersData?.map((t: any) => (
                              <option key={t.id} value={t.id}>
                                {t.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Remove Subject Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove "${cs.subject?.name}" from this class?`)) {
                              removeSubjectFromClassMutation.mutate({
                                classId: selectedClassDetail.id,
                                subjectId: cs.subjectId,
                              });
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="Remove subject from this class"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedClassDetail(null)}
                className="rounded-xl bg-[#1e3a5f] px-6 py-2 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CLASS MODAL ───────────────────────────────────────────────── */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Create Class (कक्षा थप्नुहोस्)</h2>
              <button onClick={() => setIsAddClassModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Class Name (e.g. Class 10, Class 1, Nursery) *</label>
                <input required name="name" type="text" placeholder="Class 10" className="erp-input font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Class Name (नेपाली)</label>
                <input name="nameNepali" type="text" placeholder="कक्षा १०" className="erp-input font-nepali" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Section (e.g. A, B, C)</label>
                <input name="section" type="text" placeholder="A" className="erp-input" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Main Class Teacher / Incharge (मुख्य कक्षा शिक्षक):</label>
                <select name="classTeacherId" className="erp-input font-semibold">
                  <option value="">Choose Main Class Teacher</option>
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addClassMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280]"
                >
                  {addClassMutation.isPending ? 'Saving...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT CLASS MODAL ──────────────────────────────────────────────── */}
      {isEditClassModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Modify Class Details (कक्षा विवरण सम्पादन)</h2>
              <button
                onClick={() => {
                  setIsEditClassModalOpen(false);
                  setEditingClass(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Class Name (English) *</label>
                <input
                  required
                  name="name"
                  defaultValue={editingClass.name}
                  type="text"
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Class Name (नेपाली)</label>
                <input
                  name="nameNepali"
                  defaultValue={editingClass.nameNepali || ''}
                  type="text"
                  placeholder="कक्षा १०"
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Section (e.g. A, B, C)</label>
                <input
                  name="section"
                  defaultValue={editingClass.section || ''}
                  type="text"
                  placeholder="A"
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Main Class Teacher / Incharge (मुख्य कक्षा शिक्षक):</label>
                <select
                  name="classTeacherId"
                  defaultValue={editingClass.classTeacherId || ''}
                  className="erp-input font-semibold"
                >
                  <option value="">Choose Main Class Teacher</option>
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Order Index (क्रम संख्या)</label>
                <input
                  name="orderIndex"
                  defaultValue={editingClass.orderIndex || 0}
                  type="number"
                  className="erp-input font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditClassModalOpen(false);
                    setEditingClass(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editClassMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280]"
                >
                  {editClassMutation.isPending ? 'Updating...' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD SUBJECT MODAL ─────────────────────────────────────────────── */}
      {isAddSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Add Subject to Catalog (नयाँ विषय थप्नुहोस्)</h2>
              <button onClick={() => setIsAddSubjectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Name (English) *</label>
                <input required name="name" type="text" placeholder="e.g. Sanskrit, Hotel Management" className="erp-input font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Name (नेपाली)</label>
                <input name="nameNepali" type="text" placeholder="उदा: संस्कृत, होटल व्यवस्थापन" className="erp-input font-nepali font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Code</label>
                <input name="code" type="text" placeholder="SAN-101" className="erp-input font-mono" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input id="isElective" name="isElective" type="checkbox" className="rounded text-[#1e3a5f]" />
                <label htmlFor="isElective" className="text-xs font-bold text-gray-700">
                  Is Elective (ऐच्छिक विषय)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubjectMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-5 py-1.5 font-bold text-white hover:bg-emerald-700"
                >
                  {addSubjectMutation.isPending ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT SUBJECT MODAL ────────────────────────────────────────────── */}
      {isEditSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Edit Subject (विषय सम्पादन)</h2>
              <button
                onClick={() => {
                  setIsEditSubjectModalOpen(false);
                  setEditingSubject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Name (English) *</label>
                <input
                  required
                  name="name"
                  defaultValue={editingSubject.name}
                  type="text"
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Name (नेपाली)</label>
                <input
                  name="nameNepali"
                  defaultValue={editingSubject.nameNepali || ''}
                  type="text"
                  className="erp-input font-nepali font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject Code</label>
                <input
                  name="code"
                  defaultValue={editingSubject.code || ''}
                  type="text"
                  className="erp-input font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="editIsElective"
                  name="isElective"
                  defaultChecked={editingSubject.isElective}
                  type="checkbox"
                  className="rounded text-[#1e3a5f]"
                />
                <label htmlFor="editIsElective" className="text-xs font-bold text-gray-700">
                  Is Elective (ऐच्छिक विषय)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditSubjectModalOpen(false);
                    setEditingSubject(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubjectMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280]"
                >
                  {editSubjectMutation.isPending ? 'Updating...' : 'Update Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
