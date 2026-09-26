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
  CheckSquare,
  ClipboardList,
  Clock,
  AlertCircle,
  FileCheck,
  Sparkles,
  Check,
  ChevronRight,
  Activity,
  CalendarDays,
  Flame,
  List,
  LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const INCHARGE_ROLES_CONFIG: Record<
  string,
  { label: string; nepali: string; color: string; bg: string; border: string }
> = {
  EXAM_INCHARGE: {
    label: 'Exam Incharge',
    nepali: 'परीक्षा प्रमुख',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  LIBRARIAN: {
    label: 'Librarian Incharge',
    nepali: 'पुस्तकालय प्रमुख',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    nepali: 'लेखापाल / लेखा प्रमुख',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  DISCIPLINE_INCHARGE: {
    label: 'Discipline Incharge',
    nepali: 'अनुशासन प्रमुख',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  ECA_INCHARGE: {
    label: 'Sports & ECA Incharge',
    nepali: 'खेलकुद तथा अतिरिक्त क्रियाकलाप प्रमुख',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  ACADEMIC_COORDINATOR: {
    label: 'Academic Coordinator',
    nepali: 'शैक्षिक संयोजक',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  LAB_INCHARGE: {
    label: 'Lab & IT Incharge',
    nepali: 'प्रयोगशाला तथा कम्प्युटर प्रमुख',
    color: 'text-cyan-800',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  OTHER: {
    label: 'Special Incharge',
    nepali: 'विशेष जिम्मेवारी',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
};

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

  // Top Page Tab: 'directory' | 'incharges' | 'tasks'
  const [mainViewTab, setMainViewTab] = useState<'directory' | 'incharges' | 'tasks'>('directory');

  // Directory filter state
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterType, setFilterType] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Task Filter state
  const [taskStaffFilter, setTaskStaffFilter] = useState('');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [newCredentials, setNewCredentials] = useState<any>(null);

  // Incharge Assign Modal
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<any>(null);
  const [selectedRoleContext, setSelectedRoleContext] = useState<string>('');
  const [targetInchargeRoles, setTargetInchargeRoles] = useState<string[]>([]);
  const [targetInchargeTitle, setTargetInchargeTitle] = useState('');
  const [syncUserRole, setSyncUserRole] = useState(true);
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [inchargeDueDateBs, setInchargeDueDateBs] = useState(todayBS());

  const toggleInchargeRole = (roleKey: string) => {
    setTargetInchargeRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  // Task Create/Edit Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    assignedToId: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDateBs: todayBS(),
    remarks: '',
  });

  // Form Category state in Add/Edit modal
  const [modalCategory, setModalCategory] = useState<'TEACHING' | 'NON_TEACHING'>('TEACHING');
  const [selectedPost, setSelectedPost] = useState('');
  const [customPost, setCustomPost] = useState('');
  const [modalInchargeRole, setModalInchargeRole] = useState('');
  const [modalInchargeTitle, setModalInchargeTitle] = useState('');
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
    queryKey: ['teachers', filterType, inchargeFilter, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (inchargeFilter) params.append('inchargeRole', inchargeFilter);
      if (search) params.append('search', search);
      if (statusFilter === 'ALL') params.append('all', 'true');
      else if (statusFilter === 'INACTIVE') params.append('status', 'INACTIVE');
      else params.append('status', 'ACTIVE');
      const res = await api.get(`/teachers?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['staff-tasks', taskStaffFilter, taskCategoryFilter, taskStatusFilter, taskPriorityFilter, taskSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (taskStaffFilter) params.append('teacherId', taskStaffFilter);
      if (taskCategoryFilter) params.append('category', taskCategoryFilter);
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskPriorityFilter) params.append('priority', taskPriorityFilter);
      if (taskSearch) params.append('search', taskSearch);
      const res = await api.get(`/staff-tasks?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch task summary stats
  const { data: taskSummaryData } = useQuery({
    queryKey: ['staff-tasks-summary'],
    queryFn: async () => {
      const res = await api.get('/staff-tasks/summary');
      return res.data?.data || {};
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
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove staff');
    },
  });

  // Update Staff Status (Active vs Transferred/Retired)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, statusReason, dateOfRetirementBs }: { id: number; isActive: boolean; statusReason?: string; dateOfRetirementBs?: string }) => {
      const res = await api.patch(`/teachers/${id}/status`, { isActive, statusReason, dateOfRetirementBs });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'शिक्षक/कर्मचारी स्थिति अद्यावधिक भयो');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Assign Role & Auto Tasks Mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({
      teacherId,
      inchargeRoles,
      inchargeTitle,
      syncUserRole,
      autoCreateTasks,
      dueDateBs,
    }: any) => {
      const res = await api.post(`/teachers/${teacherId}/assign-role`, {
        inchargeRoles: inchargeRoles || [],
        inchargeTitle: inchargeTitle || null,
        syncUserRole,
        autoCreateTasks,
        dueDateBs,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Incharge roles & duties assigned!');
      setIsAssignRoleModalOpen(false);
      setSelectedStaffForRole(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign role');
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await api.post('/staff-tasks', taskData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task created and assigned successfully!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    },
  });

  // Edit Task Mutation
  const editTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/staff-tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task updated successfully!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task');
    },
  });

  // Quick Status Update Mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.patch(`/staff-tasks/${id}/status`, {
        status,
        completedAtBs: status === 'COMPLETED' ? todayBS() : null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Task status updated!');
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/staff-tasks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task removed.');
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete task');
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
    data.post =
      customPost ||
      selectedPost ||
      fd.get('post') ||
      (modalCategory === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक');
    if (photoPreview) data.photoUrl = photoPreview;
    if (modalCategory === 'TEACHING') {
      data.subjectIds = selectedSubjectIds;
    } else {
      data.subjectIds = [];
    }
    const isHist = fd.get('isHistorical') === 'true';
    if (isHist) {
      data.isActive = false;
      data.enableLogin = false;
      data.isHistorical = true;
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
    data.inchargeRole = modalInchargeRole || null;
    data.inchargeTitle = modalInchargeTitle || null;
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
  const allTasks: any[] = tasksData || [];

  // Categorize
  const teachingStaff = allTeachers.filter((t: any) => t.shreni !== 'NON_TEACHING');
  const nonTeachingStaff = allTeachers.filter((t: any) => t.shreni === 'NON_TEACHING');
  const inchargeStaff = allTeachers.filter((t: any) => t.inchargeRole);

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
    setModalInchargeRole('');
    setModalInchargeTitle('');
    setPhotoPreview('');
    setSelectedSubjectIds([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    const isNonTeach = staff.shreni === 'NON_TEACHING';
    setModalCategory(isNonTeach ? 'NON_TEACHING' : 'TEACHING');
    setSelectedPost(staff.post || '');
    setCustomPost('');
    setModalInchargeRole(staff.inchargeRole || '');
    setModalInchargeTitle(staff.inchargeTitle || '');
    setEditingTeacher(staff);
    setEditPhotoPreview(staff.photoUrl || '');
    setSelectedSubjectIds(staff.subjects?.map((s: any) => s.subjectId) || []);
  };

  const openAssignRoleModal = (staff?: any, preselectedRole?: string) => {
    const targetStaff = staff || (allTeachers.length > 0 ? allTeachers[0] : null);
    setSelectedStaffForRole(targetStaff);
    setSelectedRoleContext(preselectedRole || '');

    if (targetStaff) {
      let existingRoles = targetStaff.inchargeRole
        ? targetStaff.inchargeRole.split(',').map((r: string) => r.trim()).filter(Boolean)
        : [];
      if (preselectedRole && !existingRoles.includes(preselectedRole)) {
        existingRoles = [...existingRoles, preselectedRole];
      }
      setTargetInchargeRoles(existingRoles);
      setTargetInchargeTitle(targetStaff.inchargeTitle || '');
    } else {
      setTargetInchargeRoles(preselectedRole ? [preselectedRole] : []);
      setTargetInchargeTitle('');
    }

    setSyncUserRole(true);
    setAutoCreateTasks(true);
    setInchargeDueDateBs(todayBS());
    setIsAssignRoleModalOpen(true);
  };

  const handleSwitchStaffForRole = (teacherId: number) => {
    const found = allTeachers.find((t: any) => t.id === teacherId);
    if (!found) return;
    setSelectedStaffForRole(found);
    let existingRoles = found.inchargeRole
      ? found.inchargeRole.split(',').map((r: string) => r.trim()).filter(Boolean)
      : [];
    if (selectedRoleContext && !existingRoles.includes(selectedRoleContext)) {
      existingRoles = [...existingRoles, selectedRoleContext];
    }
    setTargetInchargeRoles(existingRoles);
    setTargetInchargeTitle(found.inchargeTitle || '');
  };

  const openTaskModal = (task?: any, defaultTeacherId?: number) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'GENERAL',
        assignedToId: String(task.assignedToId || ''),
        priority: task.priority || 'MEDIUM',
        status: task.status || 'PENDING',
        dueDateBs: task.dueDateBs || todayBS(),
        remarks: task.remarks || '',
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        category: 'GENERAL',
        assignedToId: defaultTeacherId ? String(defaultTeacherId) : (allTeachers[0]?.id ? String(allTeachers[0].id) : ''),
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDateBs: todayBS(),
        remarks: '',
      });
    }
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Users className="text-[#1e3a5f]" />
            <span>Staff & Incharge Roles (शिक्षक, कर्मचारी तथा जिम्मेवारी व्यवस्थापन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            शिक्षक, गैर-शैक्षिक कर्मचारी, विशेष भूमिका (परीक्षा, पुस्तकालय, लेखापाल प्रमुख) तथा कार्य जिम्मेवारी (Tasks) व्यवस्थापन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openTaskModal()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 shadow-2xs transition cursor-pointer"
          >
            <ClipboardList size={14} />
            <span>+ Assign Task (कार्य तोक्नुहोस्)</span>
          </button>

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

      {/* Top 3 Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setMainViewTab('directory')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'directory'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={14} />
          <span>Faculty & Staff Directory ({allTeachers.length})</span>
        </button>

        <button
          onClick={() => setMainViewTab('incharges')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'incharges'
              ? 'border-purple-700 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={14} />
          <span>Incharge Roles & Posts ({inchargeStaff.length})</span>
        </button>

        <button
          onClick={() => setMainViewTab('tasks')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'tasks'
              ? 'border-emerald-700 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CheckSquare size={14} />
          <span>Task & Duty Tracking ({allTasks.length})</span>
          {taskSummaryData?.pendingTasks > 0 && (
            <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-mono">
              {taskSummaryData.pendingTasks} Pending
            </span>
          )}
        </button>
      </div>

      {/* Metric overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Faculty & Staff</span>
            <Users size={16} className="text-[#1e3a5f]" />
          </div>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-1">{allTeachers.length}</p>
          <p className="text-[11px] text-gray-500 font-nepali">
            {teachingStaff.length} शिक्षक • {nonTeachingStaff.length} कर्मचारी
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase">Special Incharges</span>
            <Award size={16} className="text-purple-700" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900 mt-1">{inchargeStaff.length}</p>
          <p className="text-[11px] text-purple-700 font-nepali">विशेष विभागीय प्रमुखहरू</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Assigned Tasks</span>
            <CheckSquare size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{allTasks.length}</p>
          <p className="text-[11px] text-emerald-700 font-nepali">
            {allTasks.filter((t) => t.status === 'COMPLETED').length} सम्पन्न •{' '}
            {allTasks.filter((t) => t.status !== 'COMPLETED').length} बाँकी
          </p>
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

      {/* ─── TAB 1: FACULTY & STAFF DIRECTORY ─── */}
      {mainViewTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            {/* Category Switcher Tabs & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 shrink-0">
                <button
                  onClick={() => setActiveCategoryTab('ALL')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeCategoryTab === 'ALL'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users size={13} />
                  <span>All Category ({allTeachers.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategoryTab('TEACHING')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeCategoryTab === 'TEACHING'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GraduationCap size={13} />
                  <span>Teaching Faculty (शिक्षक) ({teachingStaff.length})</span>
                </button>
                <button
                  onClick={() => setActiveCategoryTab('NON_TEACHING')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeCategoryTab === 'NON_TEACHING'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Briefcase size={13} />
                  <span>Non-Teaching Staff (कर्मचारी) ({nonTeachingStaff.length})</span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="inline-flex rounded-xl bg-amber-50/90 p-1 border border-amber-200 shrink-0">
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-900 hover:bg-emerald-100/50'
                  }`}
                >
                  कार्यरत (Active)
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'INACTIVE' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-900 hover:bg-rose-100/50'
                  }`}
                >
                  विगत / सरुवा (Past)
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-100/50'
                  }`}
                >
                  सबै (All)
                </button>
              </div>
            </div>

            {/* Search & Incharge Filter + View Toggle */}
            <div className="flex flex-1 items-center gap-2 max-w-xl flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[170px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, post, incharge, PAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <select
                value={inchargeFilter}
                onChange={(e) => setInchargeFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Incharges (सबै जिम्मेवारी)</option>
                {Object.entries(INCHARGE_ROLES_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.nepali} ({cfg.label})
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Types (सबै)</option>
                <option value="RASTRIYA">स्थाई (Gov)</option>
                <option value="NIJI_SROTH">निजी स्रोत (Private)</option>
              </select>

              {/* View Toggle: List vs Cards */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    viewMode === 'list'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View (तालिका / सूची स्वरूप)"
                >
                  <List size={14} />
                  <span className="hidden sm:inline">List (सूची)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    viewMode === 'grid'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid View (कार्ड स्वरूप)"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* ═════════ 1. LIST / TABLE VIEW ═════════ */}
          {viewMode === 'list' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                  <thead className="bg-[#1e3a5f] text-white font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">क्र.सं.</th>
                      <th className="py-3 px-4 min-w-[220px]">शिक्षक / कर्मचारी विवरण</th>
                      <th className="py-3 px-3 w-28">प्रकार</th>
                      <th className="py-3 px-3 min-w-[160px]">पद / तह</th>
                      <th className="py-3 px-3 min-w-[130px]">सम्पर्क</th>
                      <th className="py-3 px-4 min-w-[200px]">विशेष जिम्मेवारी (Incharge Roles)</th>
                      <th className="py-3 px-3 min-w-[130px] text-center">कार्य प्रगति</th>
                      <th className="py-3 px-4 text-right min-w-[120px]">कार्यहरू</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                          <p className="mt-2 text-xs">Loading staff directory...</p>
                        </td>
                      </tr>
                    ) : displayedStaff.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <Users size={32} className="mx-auto text-gray-300 mb-1" />
                          <p className="text-sm font-semibold text-gray-600">No staff found matching filter</p>
                          <p className="text-xs text-gray-400">Use &apos;Add Staff&apos; or &apos;Add Teacher&apos; to register members.</p>
                        </td>
                      </tr>
                    ) : (
                      displayedStaff.map((staff: any, idx: number) => {
                        const isNonTeaching = staff.shreni === 'NON_TEACHING';
                        const staffTasks = staff.tasks || [];
                        const completedCount = staffTasks.filter((t: any) => t.status === 'COMPLETED').length;

                        return (
                          <tr key={staff.id} className="hover:bg-blue-50/40 transition">
                            {/* S.N. */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-gray-500">
                              {idx + 1}
                            </td>

                            {/* Name & Photo */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold text-xs overflow-hidden border shadow-2xs ${
                                    isNonTeaching
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                      : 'bg-blue-100 text-[#1e3a5f] border-blue-200'
                                  }`}
                                >
                                  {staff.photoUrl ? (
                                    <img src={staff.photoUrl} alt={staff.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{staff.fullName.slice(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5 flex-wrap">
                                    <span>{staff.fullName}</span>
                                    <span
                                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-extrabold ${
                                        isNonTeaching
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                                      }`}
                                    >
                                      {isNonTeaching ? <Briefcase size={9} /> : <GraduationCap size={9} />}
                                      <span>{isNonTeaching ? 'कर्मचारी' : 'शिक्षक'}</span>
                                    </span>
                                    {staff.gender && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-700">
                                        {staff.gender === 'MALE' ? 'पुरुष' : staff.gender === 'FEMALE' ? 'महिला' : staff.gender}
                                      </span>
                                    )}
                                    {staff.bloodGroup && (
                                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                        🩸 {staff.bloodGroup}
                                      </span>
                                    )}
                                    {!staff.isActive && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                        विगत / सरुवा (Past)
                                      </span>
                                    )}
                                  </div>
                                  {staff.fullNameNepali && (
                                    <p className="text-[11px] text-gray-500 font-nepali">{staff.fullNameNepali}</p>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-mono text-gray-400">
                                    {staff.panNo && <span>PAN: {staff.panNo}</span>}
                                    {staff.dateOfBirthBs && <span>🎂 जन्म: {staff.dateOfBirthBs}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  staff.type === 'RASTRIYA'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {staff.type === 'RASTRIYA' ? '🏛️ स्थाई (Gov)' : '🤝 निजी स्रोत'}
                              </span>
                            </td>

                            {/* Post / Designation */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-gray-900 text-xs">
                                {staff.post || (isNonTeaching ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                              </div>
                              {staff.shreni && staff.shreni !== 'NON_TEACHING' && (
                                <span className="inline-block text-[10px] text-gray-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 font-semibold">
                                  {staff.shreni}
                                </span>
                              )}
                              {staff.subjects && staff.subjects.length > 0 && (
                                <div className="text-[10px] text-blue-800 flex items-center gap-1 mt-0.5 flex-wrap">
                                  <BookOpen size={10} />
                                  <span>{staff.subjects.map((s: any) => s.subject?.name || s.subjectId).join(', ')}</span>
                                </div>
                              )}
                              {staff.dateOfJoiningBs && (
                                <p className="text-[9.5px] text-gray-500 font-mono mt-0.5">
                                  📅 हाजिर: {staff.dateOfJoiningBs}
                                </p>
                              )}
                              {staff.dateOfRetirementBs && !staff.isActive && (
                                <p className="text-[9.5px] text-amber-700 font-mono mt-0.5">
                                  🛑 अवकाश/सरुवा: {staff.dateOfRetirementBs}
                                </p>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-3 px-3">
                              {staff.phone ? (
                                <div className="flex items-center gap-1 font-mono text-xs font-semibold text-gray-800">
                                  <Phone size={12} className="text-gray-400" />
                                  <span>{staff.phone}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">-</span>
                              )}
                              {staff.email && (
                                <div className="flex items-center gap-1 text-[10.5px] text-gray-500 truncate max-w-[150px] mt-0.5">
                                  <Mail size={11} className="text-gray-400" />
                                  <span>{staff.email}</span>
                                </div>
                              )}
                            </td>

                            {/* Special Incharge Roles */}
                            <td className="py-3 px-4">
                              {staff.inchargeRole ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {staff.inchargeRole
                                      .split(',')
                                      .map((r: string) => r.trim())
                                      .filter(Boolean)
                                      .map((roleKey: string) => {
                                        const info = INCHARGE_ROLES_CONFIG[roleKey] || {
                                          label: roleKey,
                                          nepali: roleKey,
                                          color: 'text-purple-800',
                                          bg: 'bg-purple-50',
                                          border: 'border-purple-200',
                                        };
                                        return (
                                          <span
                                            key={roleKey}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${info.bg} ${info.border} ${info.color}`}
                                          >
                                            <Award size={10} />
                                            <span>{info.nepali}</span>
                                          </span>
                                        );
                                      })}
                                  </div>
                                  {staff.inchargeTitle && (
                                    <p className="text-[10px] text-purple-950 font-bold">
                                      📌 {staff.inchargeTitle}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openAssignRoleModal(staff)}
                                  className="text-[10.5px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50/60 hover:bg-purple-100/80 px-2 py-1 rounded-md border border-purple-200/70 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={11} />
                                  <span>Assign Role</span>
                                </button>
                              )}
                            </td>

                            {/* Tasks Progress */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                    staffTasks.length > 0 && completedCount === staffTasks.length
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : staffTasks.length > 0
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-slate-50 text-gray-500 border-gray-200'
                                  }`}
                                >
                                  {completedCount} / {staffTasks.length} Done
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openTaskModal(undefined, staff.id)}
                                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                  <span>+ Task</span>
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState = !staff.isActive;
                                    const promptMsg = nextState 
                                      ? `"${staff.fullName}" लाई पुनः कार्यरत (Active) स्थितिमा ल्याउने हो?`
                                      : `"${staff.fullName}" लाई सरुवा वा अवकाश (Transferred / Retired / Inactive) स्थितिमा राख्ने हो? (Login Portal खाता बन्द हुनेछ)`;
                                    if (confirm(promptMsg)) {
                                      updateStatusMutation.mutate({
                                        id: staff.id,
                                        isActive: nextState,
                                        statusReason: nextState ? 'पुनः कार्यरत' : 'सरुवा / अवकाश',
                                      });
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    staff.isActive 
                                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                  title={staff.isActive ? 'सरुवा / अवकाश जनाउनुहोस् (Mark as Transferred / Retired)' : 'पुनः कार्यरत बनाउनुहोस् (Re-activate Staff)'}
                                >
                                  <UserCheck size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAssignRoleModal(staff)}
                                  className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                                  title="Assign / Manage Incharge Roles"
                                >
                                  <Award size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(staff)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                                  title="Edit Staff Details"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
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
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═════════ 2. GRID / CARD VIEW ═════════ */}
          {viewMode === 'grid' && (
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
                  const inchargeInfo = staff.inchargeRole ? INCHARGE_ROLES_CONFIG[staff.inchargeRole] : null;
                  const staffTasks = staff.tasks || [];
                  const completedCount = staffTasks.filter((t: any) => t.status === 'COMPLETED').length;

                  return (
                    <div
                      key={staff.id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-extrabold text-sm overflow-hidden border shadow-2xs ${
                              isNonTeaching
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                : 'bg-blue-100 text-[#1e3a5f] border-blue-200'
                            }`}
                          >
                            {staff.photoUrl ? (
                              <img src={staff.photoUrl} alt={staff.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <span>{staff.fullName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900 leading-tight flex items-center gap-1.5 flex-wrap">
                              <span>{staff.fullName}</span>
                              {!staff.isActive && (
                                <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  विगत / सरुवा
                                </span>
                              )}
                            </h3>
                            {staff.fullNameNepali && (
                              <p className="text-[10px] text-gray-500 font-nepali">{staff.fullNameNepali}</p>
                            )}

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                            type="button"
                            onClick={() => {
                              const nextState = !staff.isActive;
                              const promptMsg = nextState 
                                ? `"${staff.fullName}" लाई पुनः कार्यरत (Active) स्थितिमा ल्याउने हो?`
                                : `"${staff.fullName}" लाई सरुवा वा अवकाश (Transferred / Retired / Inactive) स्थितिमा राख्ने हो? (Login Portal खाता बन्द हुनेछ)`;
                              if (confirm(promptMsg)) {
                                updateStatusMutation.mutate({
                                  id: staff.id,
                                  isActive: nextState,
                                  statusReason: nextState ? 'पुनः कार्यरत' : 'सरुवा / अवकाश',
                                });
                              }
                            }}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              staff.isActive 
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={staff.isActive ? 'सरुवा / अवकाश जनाउनुहोस् (Mark as Transferred / Retired)' : 'पुनः कार्यरत बनाउनुहोस् (Re-activate Staff)'}
                          >
                            <UserCheck size={15} />
                          </button>
                          <button
                            onClick={() => openAssignRoleModal(staff)}
                            className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                            title="Assign Special Incharge Role & Duties"
                          >
                            <Award size={15} />
                          </button>
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

                      {/* Special Incharge Badges */}
                      {staff.inchargeRole && (
                        <div className="space-y-1.5 p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                              <Award size={12} className="text-purple-700" />
                              <span>विशेष जिम्मेवारी (Incharge Roles):</span>
                            </span>
                            <button
                              onClick={() => openAssignRoleModal(staff)}
                              className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {staff.inchargeRole
                              .split(',')
                              .map((r: string) => r.trim())
                              .filter(Boolean)
                              .map((roleKey: string) => {
                                const info = INCHARGE_ROLES_CONFIG[roleKey] || {
                                  label: roleKey,
                                  nepali: roleKey,
                                  color: 'text-purple-800',
                                  bg: 'bg-purple-50',
                                  border: 'border-purple-200',
                                };
                                return (
                                  <span
                                    key={roleKey}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${info.bg} ${info.border} ${info.color}`}
                                  >
                                    <span>{info.nepali}</span>
                                  </span>
                                );
                              })}
                          </div>
                          {staff.inchargeTitle && (
                            <p className="text-[10px] text-purple-900 font-bold">
                              📌 {staff.inchargeTitle}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-50 pt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">पद / Post:</span>
                          <span className="font-bold text-gray-900 bg-slate-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {staff.post || (isNonTeaching ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                          </span>
                        </div>

                        {staff.phone && (
                          <div className="flex justify-between font-mono">
                            <span className="text-gray-400 font-sans">Phone:</span>
                            <span className="font-semibold">{staff.phone}</span>
                          </div>
                        )}

                        {/* Tasks progress count */}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-gray-400 flex items-center gap-1">
                            <CheckSquare size={12} />
                            <span>जिम्मेवारी तथा कार्यहरू:</span>
                          </span>
                          <span className="font-bold font-mono text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            {completedCount} / {staffTasks.length} Done
                          </span>
                        </div>
                      </div>

                      {/* Quick Button to Assign Task */}
                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openAssignRoleModal(staff)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-gray-700 text-[11px] font-bold text-center transition cursor-pointer"
                        >
                          {staff.inchargeRole ? '⚙️ Manage Roles' : '+ Incharge Roles'}
                        </button>
                        <button
                          onClick={() => openTaskModal(undefined, staff.id)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold text-center transition cursor-pointer"
                        >
                          + Add Task
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: INCHARGE ROLES & POSTS OVERVIEW ─── */}
      {mainViewTab === 'incharges' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                <span>Special Incharge & Department Leads (विशेष विभागीय जिम्मेवारी)</span>
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                शिक्षक तथा गैर-शैक्षिक कर्मचारीहरूलाई परीक्षा, पुस्तकालय, लेखा, खेलकुद तथा अनुशासन जस्ता मुख्य विभागहरूको प्रमुख तोक्ने र कार्य अनुगमन गर्ने ठाउँ।
              </p>
            </div>
            <button
              onClick={() => openAssignRoleModal()}
              className="bg-white text-purple-950 hover:bg-purple-50 font-extrabold px-4 py-2 rounded-xl text-xs shadow-xs transition self-start sm:self-auto cursor-pointer"
            >
              + Assign Incharge Roles
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(INCHARGE_ROLES_CONFIG).map(([roleKey, cfg]) => {
              const assignedMembers = allTeachers.filter(
                (t) => t.inchargeRole && t.inchargeRole.split(',').map((r: string) => r.trim()).includes(roleKey)
              );

              return (
                <div
                  key={roleKey}
                  className={`rounded-2xl border p-5 bg-white shadow-2xs space-y-3.5 hover:shadow-md transition ${cfg.border}`}
                >
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`p-2 rounded-xl ${cfg.bg} ${cfg.color}`}>
                        <Award size={18} />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900">{cfg.nepali}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{cfg.label}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {assignedMembers.length} Person(s)
                    </span>
                  </div>

                  {assignedMembers.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 bg-slate-50/50 rounded-xl border border-dashed border-gray-200 text-xs">
                      <p className="font-medium">No one assigned yet (हाल रिक्त)</p>
                      <button
                        onClick={() => openAssignRoleModal(undefined, roleKey)}
                        className="mt-1.5 text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                      >
                        + Assign Staff (कर्मचारी तोक्नुहोस्)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedMembers.map((member) => {
                        const memberTasks = member.tasks || [];
                        const completed = memberTasks.filter((t: any) => t.status === 'COMPLETED').length;

                        return (
                          <div
                            key={member.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                {member.photoUrl ? (
                                  <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  member.fullName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-xs text-gray-900 leading-tight">
                                  {member.fullName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-nepali">
                                  {member.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'} • {member.post}
                                </p>
                                <p className="text-[10px] text-purple-800 font-mono font-bold mt-0.5">
                                  📋 {completed}/{memberTasks.length} tasks completed
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => openAssignRoleModal(member, roleKey)}
                                className="p-1 rounded-md text-gray-500 hover:bg-slate-200 text-right text-[10px] font-bold"
                                title="Edit Role Assignment"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openTaskModal(undefined, member.id)}
                                className="px-2 py-0.5 rounded-md bg-purple-700 text-white text-[10px] font-bold hover:bg-purple-800 shadow-2xs"
                              >
                                + Task
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openAssignRoleModal(undefined, roleKey)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>+ Add Staff to {cfg.nepali}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: TASK & DUTY TRACKING ─── */}
      {mainViewTab === 'tasks' && (
        <div className="space-y-4">
          {/* Task Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs flex-wrap">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by title, staff name, remarks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter by Staff */}
              <select
                value={taskStaffFilter}
                onChange={(e) => setTaskStaffFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Staff (सबै कर्मचारी/शिक्षक)</option>
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.inchargeRole ? `(${t.inchargeRole})` : ''}
                  </option>
                ))}
              </select>

              {/* Filter by Category */}
              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Categories (सबै विधा)</option>
                <option value="EXAM">Exam (परीक्षा)</option>
                <option value="LIBRARY">Library (पुस्तकालय)</option>
                <option value="ACCOUNT">Account (लेखा)</option>
                <option value="ACADEMIC">Academic (शैक्षिक)</option>
                <option value="DISCIPLINE">Discipline (अनुशासन)</option>
                <option value="ECA">Sports & ECA (अतिरिक्त क्रियाकलाप)</option>
                <option value="ADMIN">Administration (प्रशासनिक)</option>
                <option value="GENERAL">General (सामान्य)</option>
              </select>

              {/* Filter by Status */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Status (सबै स्थिति)</option>
                <option value="PENDING">Pending (बाँकी)</option>
                <option value="IN_PROGRESS">In Progress (सञ्चालनमा)</option>
                <option value="COMPLETED">Completed (सम्पन्न)</option>
                <option value="ON_HOLD">On Hold (स्थगित)</option>
              </select>

              {/* Filter by Priority */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Priority (प्राथमिकता)</option>
                <option value="URGENT">Urgent (अति जरुरी)</option>
                <option value="HIGH">High (उच्च)</option>
                <option value="MEDIUM">Medium (मध्यम)</option>
                <option value="LOW">Low (सामान्य)</option>
              </select>

              <button
                onClick={() => openTaskModal()}
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition"
              >
                + Create Task
              </button>
            </div>
          </div>

          {/* Task Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase">Task Title & Details</th>
                  <th className="p-3.5 font-bold uppercase">Assigned Staff</th>
                  <th className="p-3.5 font-bold uppercase">Category</th>
                  <th className="p-3.5 font-bold uppercase">Priority</th>
                  <th className="p-3.5 font-bold uppercase">Due Date (BS)</th>
                  <th className="p-3.5 font-bold uppercase text-center">Status</th>
                  <th className="p-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isTasksLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      Loading assigned tasks...
                    </td>
                  </tr>
                ) : allTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No tasks found matching filter.
                    </td>
                  </tr>
                ) : (
                  allTasks.map((task: any) => {
                    const isUrgent = task.priority === 'URGENT';
                    const isHigh = task.priority === 'HIGH';
                    const isCompleted = task.status === 'COMPLETED';
                    const isInProgress = task.status === 'IN_PROGRESS';

                    return (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="p-3.5 max-w-sm">
                          <p className={`font-bold text-gray-900 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-gray-500 font-nepali mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.remarks && (
                            <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">
                              Note: {task.remarks}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {task.assignedTo?.photoUrl ? (
                                <img src={task.assignedTo.photoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                task.assignedTo?.fullName?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 leading-tight">
                                {task.assignedTo?.fullName}
                              </p>
                              {task.assignedTo?.inchargeRole && (
                                <span className="text-[9px] font-bold text-purple-700">
                                  {task.assignedTo.inchargeRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase">
                            {task.category}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800'
                                : isHigh
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-gray-700">
                          {task.dueDateBs || '—'}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              const nextStatus = isCompleted
                                ? 'PENDING'
                                : isInProgress
                                ? 'COMPLETED'
                                : 'IN_PROGRESS';
                              updateTaskStatusMutation.mutate({ id: task.id, status: nextStatus });
                            }}
                            className={`rounded-xl px-2.5 py-1 text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Click to cycle status"
                          >
                            {isCompleted ? <Check size={13} /> : <Clock size={13} />}
                            <span>{task.status}</span>
                          </button>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openTaskModal(task)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Task"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete task "${task.title}"?`)) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ASSIGN INCHARGE ROLE MODAL ────────────────────────────────────── */}
      {isAssignRoleModalOpen && selectedStaffForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-purple-700" />
                <div>
                  <h3 className="text-base font-extrabold text-[#1e3a5f]">
                    Assign Incharge Role & Duties (विशेष जिम्मेवारी तोक्नुहोस्)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Staff: <b>{selectedStaffForRole.fullName}</b> ({selectedStaffForRole.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAssignRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Select Staff Member Dropdown */}
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-purple-950 text-xs">
                    १. कर्मचारी छनौट गर्नुहोस् (Select Teacher / Staff): *
                  </label>
                  {selectedStaffForRole && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      ID: #{selectedStaffForRole.id}
                    </span>
                  )}
                </div>
                <select
                  value={selectedStaffForRole?.id || ''}
                  onChange={(e) => handleSwitchStaffForRole(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-purple-300 p-2.5 text-xs font-bold text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                >
                  {allTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} — {t.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'} ({t.post || 'शिक्षक'})
                    </option>
                  ))}
                </select>
                {selectedStaffForRole && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 flex-wrap">
                    <span className="font-semibold">पद: {selectedStaffForRole.post || 'शिक्षक'}</span>
                    <span>•</span>
                    <span>वर्ग: {selectedStaffForRole.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'}</span>
                    {selectedStaffForRole.inchargeRole && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-emerald-800">
                          हालका जिम्मेवारी: {selectedStaffForRole.inchargeRole}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Select Multiple Roles */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700">
                    २. विशेष जिम्मेवारी छान्नुहोस् (Select Incharge Roles — बहु-चयन):
                  </label>
                  {targetInchargeRoles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetInchargeRoles([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear All (सबै हटाउनुहोस्)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(INCHARGE_ROLES_CONFIG).map(([key, cfg]) => {
                    const isChecked = targetInchargeRoles.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleInchargeRole(key)}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-purple-600 bg-purple-50/90 ring-2 ring-purple-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggled by parent wrapper
                          className="mt-0.5 rounded text-purple-700 focus:ring-purple-600 h-4 w-4 pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className={`font-bold text-xs ${isChecked ? 'text-purple-950 font-extrabold' : 'text-gray-800'}`}>
                            {cfg.nepali}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">{cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Title */}
              {targetInchargeRoles.length > 0 && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Custom Designation Title (वैकल्पिक अतिरिक्त पदनाम):
                  </label>
                  <input
                    type="text"
                    value={targetInchargeTitle}
                    onChange={(e) => setTargetInchargeTitle(e.target.value)}
                    placeholder="e.g. परीक्षा नियन्त्रक तथा पुस्तकालय प्रमुख"
                    className="erp-input font-bold text-purple-900"
                  />
                </div>
              )}

              {/* Auto Create Tasks Checkbox */}
              {targetInchargeRoles.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCreateTasks}
                      onChange={(e) => setAutoCreateTasks(e.target.checked)}
                      className="mt-0.5 rounded text-purple-700 focus:ring-purple-600 h-4 w-4"
                    />
                    <div>
                      <span className="font-extrabold text-purple-950 block">
                        Auto-assign standard responsibilities & tasks (चयन गरिएका भूमिकाहरूका मानक कार्यहरू स्वतः तोक्ने)
                      </span>
                      <span className="text-[11px] text-purple-800">
                        चयन गरिएका सबै भूमिकाहरूका प्रमुख कार्यहरू (परीक्षा तालिका, पुस्तकालय व्यवस्थापन, बिलिङ, आदि) यस कर्मचारीको खातामा स्वतः दर्ता हुनेछ।
                      </span>
                    </div>
                  </label>

                  {autoCreateTasks && (
                    <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                      <span className="font-bold text-purple-900 text-[11px]">Target Due Date (BS):</span>
                      <input
                        type="text"
                        value={inchargeDueDateBs}
                        onChange={(e) => setInchargeDueDateBs(e.target.value)}
                        className="rounded-lg border border-purple-300 bg-white px-2 py-1 text-xs font-mono font-bold text-purple-950 w-32 text-center"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Incharge Access Notice */}
              {targetInchargeRoles.length > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-emerald-950 block text-xs">
                        Teacher Portal Preserved + Incharge Hub Activated (शिक्षक पोर्टल यथावत रहने)
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        शिक्षकको मुख्य Teacher Portal हट्ने छैन। निजको शिक्षक पोर्टलभित्रै तोकिएका शाखाहरू (पुस्तकालय, लेखा, परीक्षा, आदि) को विशेष विभागीय पहुँच र कार्यहरू स्वतः खुल्नेछ।
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignRoleModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignRoleMutation.isPending}
                  onClick={() =>
                    assignRoleMutation.mutate({
                      teacherId: selectedStaffForRole.id,
                      inchargeRoles: targetInchargeRoles,
                      inchargeTitle: targetInchargeTitle,
                      syncUserRole,
                      autoCreateTasks,
                      dueDateBs: inchargeDueDateBs,
                    })
                  }
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Save & Assign Duties'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT TASK MODAL ───────────────────────────────────────── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-purple-700" />
                <h3 className="text-base font-extrabold text-[#1e3a5f]">
                  {editingTask ? 'Edit Task (कार्य सम्पादन)' : 'Assign New Task (नयाँ कार्य तोक्नुहोस्)'}
                </h3>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskForm.title || !taskForm.assignedToId) {
                  toast.error('Task title and assigned staff are required.');
                  return;
                }
                if (editingTask) {
                  editTaskMutation.mutate({ id: editingTask.id, data: taskForm });
                } else {
                  createTaskMutation.mutate(taskForm);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Task Title (कार्यको शीर्षक) *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. परीक्षा तालिका रुजु गर्ने / Question Paper Printing"
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Staff Member (जिम्मेवार शिक्षक/कर्मचारी) *</label>
                <select
                  required
                  value={taskForm.assignedToId}
                  onChange={(e) => setTaskForm((p) => ({ ...p, assignedToId: e.target.value }))}
                  className="erp-input font-semibold"
                >
                  <option value="">Select Staff Member</option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.shreni === 'NON_TEACHING' ? 'Staff' : 'Teacher'}) {t.inchargeRole ? `[${t.inchargeRole}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category (विधा)</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm((p) => ({ ...p, category: e.target.value }))}
                    className="erp-input font-semibold"
                  >
                    <option value="EXAM">Exam (परीक्षा)</option>
                    <option value="LIBRARY">Library (पुस्तकालय)</option>
                    <option value="ACCOUNT">Account (लेखा)</option>
                    <option value="ACADEMIC">Academic (शैक्षिक)</option>
                    <option value="DISCIPLINE">Discipline (अनुशासन)</option>
                    <option value="ECA">Sports & ECA (अतिरिक्त)</option>
                    <option value="ADMIN">Administration (प्रशासनिक)</option>
                    <option value="GENERAL">General (सामान्य)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority (प्राथमिकता)</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                    className="erp-input font-bold text-purple-900"
                  >
                    <option value="URGENT">🔴 Urgent (अति जरुरी)</option>
                    <option value="HIGH">🟠 High (उच्च)</option>
                    <option value="MEDIUM">🔵 Medium (मध्यम)</option>
                    <option value="LOW">⚪ Low (सामान्य)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date (BS)</label>
                  <input
                    type="text"
                    value={taskForm.dueDateBs}
                    onChange={(e) => setTaskForm((p) => ({ ...p, dueDateBs: e.target.value }))}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status (स्थिति)</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                    className="erp-input font-semibold"
                  >
                    <option value="PENDING">Pending (बाँकी)</option>
                    <option value="IN_PROGRESS">In Progress (सञ्चालनमा)</option>
                    <option value="COMPLETED">Completed (सम्पन्न)</option>
                    <option value="ON_HOLD">On Hold (स्थगित)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Instructions (विवरण / निर्देशन)</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed instructions for the task..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
                <input
                  type="text"
                  value={taskForm.remarks}
                  onChange={(e) => setTaskForm((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Additional remarks..."
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || editTaskMutation.isPending}
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {createTaskMutation.isPending || editTaskMutation.isPending
                    ? 'Saving...'
                    : editingTask
                    ? 'Update Task'
                    : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  व्यक्तिगत विवरण, पद, तह, विशेष जिम्मेवारी तथा पोर्टल लगइन सिर्जना
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

              {/* Personal Details: Gender (Compulsory *), Blood Group, Date of Birth (BS) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Gender (लिङ्ग) <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <select required name="gender" className="erp-input font-bold text-[#1e3a5f] bg-white">
                    <option value="">-- चयन गर्नुहोस् (Select) * --</option>
                    <option value="MALE">पुरुष (Male)</option>
                    <option value="FEMALE">महिला (Female)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Blood Group (रक्त समूह)</label>
                  <select name="bloodGroup" className="erp-input font-semibold bg-white">
                    <option value="">-- छैन / Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Birth (जन्म मिति BS)</label>
                  <input
                    name="dateOfBirthBs"
                    type="text"
                    placeholder="उदा: २०४०-०५-१५"
                    className="erp-input font-mono bg-white"
                  />
                </div>
              </div>

              {/* Post / Designation Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  पद / Designation ({modalCategory === 'NON_TEACHING' ? 'गैर-शैक्षिक पद' : 'शिक्षक पद'}) *
                </label>
                <select
                  value={selectedPost}
                  onChange={(e) => setSelectedPost(e.target.value)}
                  className="erp-input font-semibold"
                >
                  {modalCategory === 'NON_TEACHING'
                    ? NON_TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                    : TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
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

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No) *</label>
                  <input required name="phone" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input name="email" type="email" placeholder="staff@school.edu.np" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Citizenship No (नागरिकता नं.)</label>
                  <input name="citizenshipNo" type="text" placeholder="नागरिकता नं." className="erp-input font-mono" />
                </div>
              </div>

              {/* Service Dates: Joining & Retirement / Exit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Joining (नियुक्ति/हाजिर मिति BS)</label>
                  <input name="dateOfJoiningBs" type="text" placeholder="उदा: २०७५-०४-०१" className="erp-input font-mono bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Retirement / Exit (अवकाश/सरुवा मिति BS)</label>
                  <input name="dateOfRetirementBs" type="text" placeholder="उदा: २०८५-०४-०१" className="erp-input font-mono bg-white" />
                </div>
              </div>

              {/* Financial IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                            isChecked
                              ? 'bg-white border-blue-400 font-bold text-blue-900'
                              : 'bg-white/60 border-gray-200 text-gray-600'
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

              {/* Past / Historical Staff Toggle */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isHistorical"
                    id="isHistorical"
                    value="true"
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-amber-950">
                      विगत / पूर्व शिक्षक वा कर्मचारी (Past / Historical Staff Record)
                    </span>
                    <p className="text-[11px] text-amber-800 font-nepali">
                      विगतका आर्थिक वर्षको तलब भरपाईका लागि मात्र दर्ता गर्ने हो भने चिन्ह लगाउनुहोस्। यिनीहरूको कुनै Login Portal खाता सिर्जना हुने छैन।
                    </p>
                  </div>
                </label>
              </div>

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
                  Update personal, designation, incharge role, category or portal role
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

              {/* Personal Details: Gender (Compulsory *), Blood Group, Date of Birth (BS) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Gender (लिङ्ग) <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <select
                    required
                    name="gender"
                    defaultValue={editingTeacher.gender || ''}
                    className="erp-input font-bold text-[#1e3a5f] bg-white"
                  >
                    <option value="">-- चयन गर्नुहोस् (Select) * --</option>
                    <option value="MALE">पुरुष (Male)</option>
                    <option value="FEMALE">महिला (Female)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Blood Group (रक्त समूह)</label>
                  <select
                    name="bloodGroup"
                    defaultValue={editingTeacher.bloodGroup || ''}
                    className="erp-input font-semibold bg-white"
                  >
                    <option value="">-- छैन / Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Birth (जन्म मिति BS)</label>
                  <input
                    name="dateOfBirthBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfBirthBs || ''}
                    placeholder="उदा: २०४०-०५-१५"
                    className="erp-input font-mono bg-white"
                  />
                </div>
              </div>

              {/* Post & Incharge Selection */}
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
                    {modalCategory === 'NON_TEACHING'
                      ? NON_TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                      : TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Special Incharge Role (विशेष जिम्मेवारी):</label>
                  <select
                    value={modalInchargeRole}
                    onChange={(e) => setModalInchargeRole(e.target.value)}
                    className="erp-input font-bold text-purple-900"
                  >
                    <option value="">No Incharge Role (सामान्य)</option>
                    {Object.entries(INCHARGE_ROLES_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>{cfg.nepali} ({cfg.label})</option>
                    ))}
                  </select>
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

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
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
                  <label className="block font-bold text-gray-700 mb-1">Citizenship No (नागरिकता नं.)</label>
                  <input
                    name="citizenshipNo"
                    type="text"
                    defaultValue={editingTeacher.citizenshipNo || ''}
                    placeholder="नागरिकता नं."
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              {/* Service Dates: Joining & Retirement / Exit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Joining (नियुक्ति/हाजिर मिति BS)</label>
                  <input
                    name="dateOfJoiningBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfJoiningBs || ''}
                    placeholder="उदा: २०७५-०४-०१"
                    className="erp-input font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Retirement / Exit (अवकाश/सरुवा मिति BS)</label>
                  <input
                    name="dateOfRetirementBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfRetirementBs || ''}
                    placeholder="उदा: २०८५-०४-०१"
                    className="erp-input font-mono bg-white"
                  />
                </div>
              </div>

              {/* Financial IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN Number</label>
                  <input
                    name="panNo"
                    type="text"
                    defaultValue={editingTeacher.panNo || ''}
                    placeholder="PAN 102938475"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sanchaya Kosh (SSK) No</label>
                  <input
                    name="sanchayaKoshNo"
                    type="text"
                    defaultValue={editingTeacher.sanchayaKoshNo || ''}
                    placeholder="SSK Number"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nagarik Lagani Kosh (CIT)</label>
                  <input
                    name="nagarikLaganiKoshNo"
                    type="text"
                    defaultValue={editingTeacher.nagarikLaganiKoshNo || ''}
                    placeholder="CIT Number"
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
                            isChecked
                              ? 'bg-white border-blue-400 font-bold text-blue-900'
                              : 'bg-white/60 border-gray-200 text-gray-600'
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
