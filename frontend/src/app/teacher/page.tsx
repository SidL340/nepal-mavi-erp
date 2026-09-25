'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  Users,
  School,
  Globe,
  ExternalLink,
  X,
  Clock,
  FileText,
  Check,
  AlertTriangle,
  PhoneCall,
  UserCheck,
  Send,
  CheckSquare,
  DollarSign,
  Layers,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Trophy,
  Laptop,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

const DAYS_MAP: Record<number, string> = {
  1: 'आइतबार (Sunday)',
  2: 'सोमबार (Monday)',
  3: 'मंगलबार (Tuesday)',
  4: 'बुधबार (Wednesday)',
  5: 'बिहीबार (Thursday)',
  6: 'शुक्रबार (Friday)',
};

export default function TeacherPortalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const teacherId = user?.teacher?.id;

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'daily_log'
    | 'tasks'
    | 'routine'
    | 'leaves'
    | 'students_leave'
    | 'incharge_exam'
    | 'incharge_library'
    | 'incharge_account'
    | 'incharge_coordinator'
  >('overview');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [dailyLog, setDailyLog] = useState('');
  const [selectedClassLog, setSelectedClassLog] = useState('');

  // Daily Teaching Log Form State
  const [logFormClassId, setLogFormClassId] = useState<string>('');
  const [logFormSubjectId, setLogFormSubjectId] = useState<string>('');
  const [logFormSubjectName, setLogFormSubjectName] = useState<string>('');
  const [logFormDateBs, setLogFormDateBs] = useState<string>(todayBS());
  const [logFormPeriodNo, setLogFormPeriodNo] = useState<number | ''>(1);
  const [logFormTopic, setLogFormTopic] = useState<string>('');
  const [logFormOutcome, setLogFormOutcome] = useState<string>('');
  const [logFormHomework, setLogFormHomework] = useState<string>('');
  const [logFormMethod, setLogFormMethod] = useState<string>('व्याख्या तथा छलफल (Discussion & Lecture)');
  const [logFilterDateBs, setLogFilterDateBs] = useState<string>(todayBS());
  const [logFilterClassId, setLogFilterClassId] = useState<string>('');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Profile Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPanNo, setEditPanNo] = useState('');

  // Teacher Leave Form State
  const [leaveStartDate, setLeaveStartDate] = useState(todayBS());
  const [leaveEndDate, setLeaveEndDate] = useState(todayBS());
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Edit Teacher Leave State
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [isEditLeaveModalOpen, setIsEditLeaveModalOpen] = useState(false);
  const [editLeaveStartDate, setEditLeaveStartDate] = useState('');
  const [editLeaveEndDate, setEditLeaveEndDate] = useState('');
  const [editLeaveDaysCount, setEditLeaveDaysCount] = useState(1);
  const [editLeaveReason, setEditLeaveReason] = useState('');

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeTargetClassId, setNoticeTargetClassId] = useState('');
  const [sendSms, setSendSms] = useState(false);

  // Problem to Admin Form State
  const [problemTitle, setProblemTitle] = useState('');
  const [problemCategory, setProblemCategory] = useState('FACILITIES');
  const [problemPriority, setProblemPriority] = useState('NORMAL');
  const [problemBody, setProblemBody] = useState('');

  // 1. Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Notices
  const { data: noticesData } = useQuery({
    queryKey: ['notices-teacher'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // 3. Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // 4. Fetch Teacher's Routine
  const { data: teacherRoutine, isLoading: isRoutineLoading } = useQuery({
    queryKey: ['teacher-routine', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await api.get(`/routine/teacher/${teacherId}`);
      return res.data?.data || [];
    },
    enabled: !!teacherId,
  });

  // 5. Fetch Teacher's Own Leaves
  const { data: myLeaves, isLoading: isMyLeavesLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves/my');
      return res.data?.data || [];
    },
  });

  // 6. Fetch Student Leaves if Class Teacher
  const { data: classPendingLeavesData, isLoading: isClassLeavesLoading } = useQuery({
    queryKey: ['class-pending-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves/class-pending');
      return res.data;
    },
  });

  const studentLeaves = classPendingLeavesData?.data || [];
  const myAssignedClasses = classesData?.filter((c: any) => c.classTeacherId === teacherId) || [];
  const pendingStudentLeavesCount = studentLeaves.filter((l: any) => l.status === 'PENDING').length;

  // 7. Fetch Assigned Tasks & Duties
  const { data: myTasksData, isLoading: isMyTasksLoading } = useQuery({
    queryKey: ['my-staff-tasks'],
    queryFn: async () => {
      const res = await api.get('/staff-tasks');
      return res.data?.data || [];
    },
  });

  // 8. Fetch Teacher Detailed Profile (with Incharge Role)
  const { data: teacherDetails } = useQuery({
    queryKey: ['teacher-details', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await api.get(`/teachers/${teacherId}`);
      return res.data?.data || null;
    },
    enabled: !!teacherId,
  });

  // 9. Fetch Teacher's Teaching Logs (Filtered)
  const { data: teacherLogsData, isLoading: isTeacherLogsLoading } = useQuery({
    queryKey: ['teacher-daily-logs', teacherId, logFilterDateBs, logFilterClassId],
    queryFn: async () => {
      if (!teacherId) return [];
      const params = new URLSearchParams();
      params.append('teacherId', String(teacherId));
      if (logFilterDateBs) params.append('dateBs', logFilterDateBs);
      if (logFilterClassId) params.append('classId', logFilterClassId);
      const res = await api.get(`/daily-logs?${params.toString()}`);
      return res.data?.data?.logs || [];
    },
    enabled: !!teacherId,
  });

  // Create Teaching Log Mutation
  const createTeachingLogMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/daily-logs', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-logs'] });
      setLogFormTopic('');
      setLogFormOutcome('');
      setLogFormHomework('');
      setDailyLog('');
      toast.success(data.message || 'Teaching log saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save teaching log.');
    },
  });

  // Delete Teaching Log Mutation
  const deleteTeachingLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/daily-logs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-logs'] });
      toast.success('Teaching log deleted.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete log.');
    },
  });

  const myTasks: any[] = myTasksData || [];
  const pendingTasksCount = myTasks.filter((t) => t.status !== 'COMPLETED').length;

  // Quick Task Status Update Mutation
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
      queryClient.invalidateQueries({ queryKey: ['my-staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    },
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!teacherId) throw new Error('Teacher record not found.');
      const res = await api.put(`/teachers/${teacherId}`, {
        fullName: editFullName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        panNo: editPanNo,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Your teacher profile details updated successfully!');
      setIsEditProfileModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/leaves/apply', {
        startDateBs: leaveStartDate,
        endDateBs: leaveEndDate,
        totalDays: leaveDaysCount,
        reason: leaveReason,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('बिदाको निवेदन दर्ता भयो! स्वीकृतिका लागि प्रशासनलाई सम्पर्क गर्नुहोस्।');
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा आवेदन पठाउन सकिएन।');
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/leaves/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('बिदाको निवेदन सफलतापूर्वक परिमार्जन गरियो!');
      setIsEditLeaveModalOpen(false);
      setEditingLeave(null);
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा परिमार्जन गर्न सकिएन।');
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/leaves/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('तपाईंको बिदा आवेदन रद्द गरियो।');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा रद्द गर्न सकिएन।');
    },
  });

  const reviewStudentLeaveMutation = useMutation({
    mutationFn: async ({ leaveId, status, remarks }: { leaveId: number; status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
      const res = await api.post(`/leaves/${leaveId}/review`, { status, remarks });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'निर्णय सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['class-pending-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'कारबाही गर्न सकिएन।');
    },
  });

  const sendNoticeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notices', {
        title: noticeTitle,
        body: noticeBody,
        type: 'CLASS',
        targetClassId: noticeTargetClassId ? parseInt(noticeTargetClassId) : null,
        postedDateBs: todayBS(),
        sendSms,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice dispatched to students successfully!');
      setIsNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeBody('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send notice');
    },
  });

  const reportProblemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notices', {
        title: `[Teacher Report - ${problemPriority}] ${problemTitle} (${problemCategory})`,
        body: problemBody,
        type: 'TEACHER_REPORT',
        targetRole: 'ADMIN',
        postedDateBs: todayBS(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Problem/Report submitted to Principal & Administration!');
      setIsProblemModalOpen(false);
      setProblemTitle('');
      setProblemBody('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    },
  });

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyLog) return;
    toast.success(`Lesson log for ${todayBS()} saved!`);
    setDailyLog('');
  };

  const displayName = user?.teacher?.fullName || user?.username || 'Teacher';

  const teacherProfile = teacherDetails || (user?.teacher as any) || {};
  const inchargeString = teacherProfile.inchargeRole || '';
  const inchargeRolesList = inchargeString
    .split(',')
    .map((r: string) => r.trim().toUpperCase())
    .filter(Boolean);

  const hasExamIncharge =
    inchargeRolesList.includes('EXAM_INCHARGE') || inchargeRolesList.includes('EXAM');
  const hasLibraryIncharge =
    inchargeRolesList.includes('LIBRARIAN') ||
    inchargeRolesList.includes('LIBRARY') ||
    user?.role === 'LIBRARIAN';
  const hasAccountantIncharge =
    inchargeRolesList.includes('ACCOUNTANT') ||
    inchargeRolesList.includes('ACCOUNT') ||
    user?.role === 'ACCOUNTANT';
  const hasCoordinatorIncharge = inchargeRolesList.includes('ACADEMIC_COORDINATOR');
  const hasDisciplineIncharge = inchargeRolesList.includes('DISCIPLINE_INCHARGE');
  const hasEcaIncharge = inchargeRolesList.includes('ECA_INCHARGE');
  const hasLabIncharge = inchargeRolesList.includes('LAB_INCHARGE');
  const hasAnyInchargeRole =
    inchargeRolesList.length > 0 ||
    ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'LIBRARIAN'].includes(user?.role || '');

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300">
              <Calendar size={13} />
              <span>BS {todayBSFormatted()}</span>
            </div>
            <a
              href="https://nepalssb.edu.np"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3 py-0.5 text-xs font-black shadow-xs transition"
            >
              <Globe size={13} />
              <span>Visit School Website (nepalssb.edu.np)</span>
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <h1 className="text-2xl font-extrabold">Welcome, {displayName}!</h1>
            {teacherDetails?.inchargeRole && (
              <div className="flex flex-wrap items-center gap-1.5">
                {teacherDetails.inchargeRole
                  .split(',')
                  .map((r: string) => r.trim())
                  .filter(Boolean)
                  .map((rk: string) => (
                    <span
                      key={rk}
                      className="px-2.5 py-0.5 bg-amber-400 text-[#1e3a5f] font-extrabold rounded-lg text-xs flex items-center gap-1 shadow-xs border border-amber-300"
                    >
                      <Award size={13} />
                      <span>{rk}</span>
                    </span>
                  ))}
                {teacherDetails.inchargeTitle && (
                  <span className="text-xs text-amber-200 font-bold">
                    ({teacherDetails.inchargeTitle})
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => {
                const tObj = (user?.teacher as any) || {};
                setEditFullName(tObj.fullName || '');
                setEditPhone(tObj.phone || '');
                setEditEmail(tObj.email || '');
                setEditAddress(tObj.address || '');
                setEditPanNo(tObj.panNo || '');
                setIsEditProfileModalOpen(true);
              }}
              className="ml-auto px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <span>✏️ Edit Profile</span>
            </button>
          </div>
          <p className="text-xs text-blue-200 mt-0.5 font-nepali">
            शिक्षक तथा कर्मचारी पोर्टल: दैनिक कार्य जिम्मेवारी, कक्षा रुटिन, बिदा आवेदन तथा विद्यार्थी बिदा स्वीकृति
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAnyInchargeRole && (
            <Link
              href="/dashboard"
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3.5 py-2 text-xs font-black transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard size={14} />
              <span>Full ERP Dashboard (प्रशासनिक ड्यासबोर्ड) →</span>
            </Link>
          )}
          <button
            onClick={() => setActiveTab('tasks')}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare size={14} />
            <span>My Tasks ({pendingTasksCount} Pending)</span>
          </button>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="rounded-xl bg-amber-400/90 hover:bg-amber-400 text-[#1e3a5f] px-3.5 py-2 text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} />
            <span>Apply for Leave (बिदाको निवेदन)</span>
          </button>
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="rounded-xl bg-rose-500/90 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
          >
            ⚠️ Report Issue
          </button>
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="rounded-xl bg-white/20 hover:bg-white/30 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
          >
            📢 Send Notice
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('daily_log')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'daily_log'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <BookOpen size={15} className="text-amber-400" />
          <span>Daily Teaching Log (दैनिक शिक्षण लग)</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <CheckSquare size={15} />
          <span>My Tasks & Duties (कार्यहरू)</span>
          {pendingTasksCount > 0 && (
            <span className="h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              {pendingTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('routine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'routine'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Clock size={15} />
          <span>My Timetable (घण्टी तालिका)</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'leaves'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText size={15} />
          <span>My Leaves (मेरो बिदा)</span>
        </button>

        {myAssignedClasses.length > 0 && (
          <button
            onClick={() => setActiveTab('students_leave')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'students_leave'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <UserCheck size={15} />
            <span>Student Leaves (विद्यार्थी बिदा)</span>
            {pendingStudentLeavesCount > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {pendingStudentLeavesCount}
              </span>
            )}
          </button>
        )}

        {/* ─── DYNAMIC INCHARGE ROLE SUB-PORTAL TABS (Added seamlessly without disturbing teacher tabs) ─── */}
        {hasExamIncharge && (
          <button
            onClick={() => setActiveTab('incharge_exam')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'incharge_exam'
                ? 'bg-purple-800 text-white shadow-xs ring-2 ring-purple-300'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Award size={15} className="text-purple-600" />
            <span>Exam Department (परीक्षा शाखा)</span>
          </button>
        )}

        {hasLibraryIncharge && (
          <button
            onClick={() => setActiveTab('incharge_library')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'incharge_library'
                ? 'bg-blue-800 text-white shadow-xs ring-2 ring-blue-300'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <BookOpen size={15} className="text-blue-600" />
            <span>Library Portal (पुस्तकालय शाखा)</span>
          </button>
        )}

        {hasAccountantIncharge && (
          <button
            onClick={() => setActiveTab('incharge_account')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'incharge_account'
                ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <DollarSign size={15} className="text-emerald-600" />
            <span>Account & Finance (लेखा शाखा)</span>
          </button>
        )}

        {(hasCoordinatorIncharge || hasDisciplineIncharge || hasEcaIncharge || hasLabIncharge) && (
          <button
            onClick={() => setActiveTab('incharge_coordinator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'incharge_coordinator'
                ? 'bg-indigo-800 text-white shadow-xs ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Layers size={15} className="text-indigo-600" />
            <span>Incharge Coordination (विभागीय समन्वय)</span>
          </button>
        )}
      </div>

      {/* ─── TAB 1: OVERVIEW & DIARY ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Assigned Class Banner */}
          {myAssignedClasses.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                  <School size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      मुख्य कक्षा शिक्षक (Main Class Teacher)
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-950 mt-0.5">
                    {myAssignedClasses.map((c: any) => `${c.name}${c.section ? ` (${c.section})` : ''}`).join(', ')}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('students_leave')}
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                >
                  Student Leaves ({pendingStudentLeavesCount} Pending)
                </button>
                <Link
                  href="/dashboard/attendance"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition"
                >
                  Take Today's Attendance →
                </Link>
              </div>
            </div>
          )}

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Link
              href="/dashboard/attendance"
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs hover:shadow-md transition flex items-center gap-3 group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
                <CalendarCheck size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Daily Attendance</h3>
                <p className="text-[11px] text-gray-400 font-nepali">कक्षा शिक्षक हाजिरी</p>
              </div>
            </Link>

            <Link
              href="/dashboard/exams"
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs hover:shadow-md transition flex items-center gap-3 group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition">
                <Award size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Exam Marks Entry</h3>
                <p className="text-[11px] text-gray-400 font-nepali">प्राप्ताङ्क प्रविष्टि</p>
              </div>
            </Link>

            <button
              onClick={() => setActiveTab('routine')}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs hover:shadow-md transition flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
                <Clock size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Teaching Timetable</h3>
                <p className="text-[11px] text-gray-400 font-nepali">घण्टी तालिका</p>
              </div>
            </button>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs hover:shadow-md transition flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Apply for Leave</h3>
                <p className="text-[11px] text-gray-400 font-nepali">बिदाको निवेदन</p>
              </div>
            </button>
          </div>

          {/* Academic Calendar */}
          <AcademicCalendar />

          {/* Main Content Grid: Teaching Diary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <BookOpen size={18} className="text-[#1e3a5f]" />
                <span>Daily Teaching Log (आज के पढाइयो?)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Record what topic and assignment you taught today to keep parents and administration updated.
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Class Taught *</label>
                    <select
                      required
                      value={selectedClassLog}
                      onChange={(e) => setSelectedClassLog(e.target.value)}
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
                    <label className="block font-bold text-gray-700 mb-1">Date (BS)</label>
                    <input type="text" readOnly value={todayBS()} className="erp-input font-mono font-bold bg-slate-50" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Topics Taught & Homework Assigned *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. Chapter 4: Photosynthesis - covered light & dark reaction. Homework: Exercises 1 to 5 on page 48."
                    value={dailyLog}
                    onChange={(e) => setDailyLog(e.target.value)}
                    className="erp-input leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  disabled={createTeachingLogMutation.isPending}
                  onClick={() => {
                    if (!selectedClassLog) {
                      toast.error('Please select a class first.');
                      return;
                    }
                    if (!dailyLog.trim()) {
                      toast.error('Please enter the topics taught and homework.');
                      return;
                    }
                    createTeachingLogMutation.mutate({
                      teacherId,
                      classId: selectedClassLog,
                      dateBs: todayBS(),
                      periodNo: 1,
                      topicTaught: dailyLog.trim(),
                      homework: dailyLog.includes('Homework') ? dailyLog.split(/homework/i)[1]?.trim() : null,
                      status: 'COMPLETED',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{createTeachingLogMutation.isPending ? 'Saving...' : 'Save Lesson Diary (डायरी सुरक्षित)'}</span>
                </button>
              </div>
            </div>

            {/* School Announcements */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <School size={16} className="text-blue-600" />
                  <span>School Announcements & Notices</span>
                </h2>

                <div className="space-y-2.5">
                  {noticesData?.slice(0, 5).map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900">{n.title}</p>
                        <span className="text-[9px] rounded px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px] mt-0.5 line-clamp-2">{n.body}</p>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">{n.postedDateBs} BS</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: DAILY TEACHING LOG (दैनिक शिक्षण डायरी) ────────────────────── */}
      {activeTab === 'daily_log' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-[#1e3a5f] font-black text-xs rounded-lg mb-1.5 shadow-2xs">
                <BookOpen size={14} />
                <span>Teacher Daily Diary & Classroom Teaching Log</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">दैनिक शिक्षण लग तथा सिकाइ सहजीकरण डायरी</h2>
              <p className="text-xs text-blue-200 mt-0.5 font-nepali">
                प्रत्येक घण्टीमा पढाएको पाठ, सिकाइ उपलब्धि तथा विद्यार्थीलाई दिएको गृहकार्य रेकर्ड गर्नुहोस्। यो विवरण विद्यार्थी र प्रशासनले पनि हेर्न सक्नेछन्।
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-white/20 px-3.5 py-2 rounded-xl text-white font-black backdrop-blur-xs">
                {teacherLogsData?.length || 0} Lessons Recorded
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Quick Add Lesson Log Form */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-500" />
                  <span>Record Lesson Taught (नयाँ पाठ प्रविष्टि)</span>
                </h3>
                <p className="text-[11px] text-gray-500">Log today's completed classroom period</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!logFormClassId) {
                    toast.error('Please select a class.');
                    return;
                  }
                  if (!logFormTopic.trim()) {
                    toast.error('Please enter the lesson topic taught.');
                    return;
                  }

                  createTeachingLogMutation.mutate({
                    teacherId,
                    classId: logFormClassId,
                    subjectId: logFormSubjectId || undefined,
                    subjectName: logFormSubjectName || undefined,
                    dateBs: logFormDateBs || todayBS(),
                    periodNo: logFormPeriodNo || 1,
                    topicTaught: logFormTopic.trim(),
                    learningOutcome: logFormOutcome.trim() || undefined,
                    homework: logFormHomework.trim() || undefined,
                    teachingMethod: logFormMethod.trim() || undefined,
                    status: 'COMPLETED',
                  });
                }}
                className="space-y-3 text-xs"
              >
                {/* Class & Period */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Class (कक्षा) *</label>
                    <select
                      required
                      value={logFormClassId}
                      onChange={(e) => setLogFormClassId(e.target.value)}
                      className="erp-input font-bold"
                    >
                      <option value="">-- Select Class --</option>
                      {classesData?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Period (घण्टी) *</label>
                    <select
                      value={logFormPeriodNo}
                      onChange={(e) => setLogFormPeriodNo(Number(e.target.value))}
                      className="erp-input font-bold"
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={p}>
                          Period {p} ({p}st/nd/th Hour)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject & Date */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Subject (विषय) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Science / Math / नेपाली"
                      value={logFormSubjectName}
                      onChange={(e) => setLogFormSubjectName(e.target.value)}
                      className="erp-input font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Date (मिति BS) *</label>
                    <input
                      type="text"
                      required
                      value={logFormDateBs}
                      onChange={(e) => setLogFormDateBs(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Topic Taught */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Lesson Topic Taught (पढाइएको पाठ / शीर्षक) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Chapter 5: Human Circulatory System - Blood vessels & Heart structure"
                    value={logFormTopic}
                    onChange={(e) => setLogFormTopic(e.target.value)}
                    className="erp-input"
                  />
                </div>

                {/* Learning Outcome */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Learning Outcome (सिकाइ उपलब्धि):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Students can sketch and label heart chambers"
                    value={logFormOutcome}
                    onChange={(e) => setLogFormOutcome(e.target.value)}
                    className="erp-input"
                  />
                </div>

                {/* Homework Assigned */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Homework / Assignment (गृहकार्य / कक्षाकार्य):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Solve Q1 to Q6 from exercise 5.2 and make a summary note"
                    value={logFormHomework}
                    onChange={(e) => setLogFormHomework(e.target.value)}
                    className="erp-input font-medium"
                  />
                </div>

                {/* Teaching Method */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Teaching Method / Materials (विधि र सामग्री):
                  </label>
                  <input
                    type="text"
                    value={logFormMethod}
                    onChange={(e) => setLogFormMethod(e.target.value)}
                    className="erp-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createTeachingLogMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] py-2.5 font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>
                    {createTeachingLogMutation.isPending
                      ? 'Saving Lesson Log...'
                      : 'Save Teaching Log (डायरी सुरक्षित गर्नुहोस्)'}
                  </span>
                </button>
              </form>
            </div>

            {/* Right 7 Cols: History of Teaching Logs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-600">Date (मिति):</label>
                  <input
                    type="text"
                    value={logFilterDateBs}
                    onChange={(e) => setLogFilterDateBs(e.target.value)}
                    className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 w-28"
                  />
                  <button
                    type="button"
                    onClick={() => setLogFilterDateBs(todayBS())}
                    className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-[10px] font-bold"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={logFilterClassId}
                    onChange={(e) => setLogFilterClassId(e.target.value)}
                    className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-bold bg-slate-50"
                  >
                    <option value="">All Classes</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Logs List Cards */}
              {isTeacherLogsLoading ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                  <p className="text-xs">Loading your lesson logs...</p>
                </div>
              ) : !teacherLogsData || teacherLogsData.length === 0 ? (
                <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white p-6 space-y-2">
                  <BookOpen size={36} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-sm font-bold text-gray-700">कुनै शिक्षण लग फेला परेन (No logs for this date)</p>
                  <p className="text-xs text-gray-400">दायाँ तर्फको फारमबाट आफ्नो दैनिक पाठ र गृहकार्य लग सुरक्षित गर्नुहोस्।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherLogsData.map((log: any) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            {log.periodNo ? `PERIOD ${log.periodNo}` : 'HOUR'}
                          </span>
                          <strong className="text-sm text-gray-900">
                            {log.class?.name} ({log.class?.section || 'A'}) • {log.subject?.name || log.subjectName || 'General'}
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            सम्पन्न
                          </span>
                          <button
                            onClick={() => {
                              if (confirm('Delete this lesson log?')) {
                                deleteTeachingLogMutation.mutate(log.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                            title="Delete Log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">पढाइएको पाठ (Topic Taught):</span>
                        <p className="text-xs text-gray-800 font-semibold mt-0.5">{log.topicTaught}</p>
                      </div>

                      {log.learningOutcome && (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          <span>🎯 सिकाइ उपलब्धि: </span>
                          <span>{log.learningOutcome}</span>
                        </div>
                      )}

                      {log.homework && (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-950">
                          <strong className="block text-[10px] uppercase font-black text-amber-900">
                            📝 गृहकार्य (Homework):
                          </strong>
                          <p className="font-bold mt-0.5">{log.homework}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: MY ASSIGNED TASKS & INCHARGE DUTIES ───────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Incharge Role Header Card */}
          {teacherDetails?.inchargeRole ? (
            <div className="rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-purple-950 font-extrabold text-xs rounded-lg mb-1.5">
                  <Award size={14} />
                  <span>Your Special Incharge Role (तपाईंको विभागीय जिम्मेवारी)</span>
                </div>
                <h2 className="text-xl font-extrabold">
                  {teacherDetails.inchargeTitle || teacherDetails.inchargeRole}
                </h2>
                <p className="text-xs text-purple-200 mt-0.5 font-nepali">
                  विद्यालय प्रशासनद्वारा तपाईंलाई तोकिएका मुख्य जिम्मेवारी तथा कार्यहरू तल दिइएका छन्। कार्य सम्पन्न भएपछि स्थिति परिवर्तन गर्नुहोस्।
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="bg-white/20 px-3 py-1.5 rounded-xl text-white font-bold">
                  {myTasks.filter((t) => t.status === 'COMPLETED').length} / {myTasks.length} Done
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <CheckSquare size={18} className="text-purple-700" />
                  <span>My Assigned Tasks & Duties (मेरा कार्य जिम्मेवारीहरू)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  प्रशासनबाट तपाईंलाई तोकिएका कार्यहरूको प्रगति स्थिति अद्यावधिक गर्नुहोस्।
                </p>
              </div>
            </div>
          )}

          {/* Filter Status Buttons */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 px-2">Filter:</span>
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTaskStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  taskStatusFilter === st
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? `All (${myTasks.length})` : st}
              </button>
            ))}
          </div>

          {/* Task Cards List */}
          {isMyTasksLoading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="mt-2 text-xs">कार्यहरू लोड हुँदैछन्...</p>
            </div>
          ) : myTasks.length === 0 ? (
            <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
              <CheckSquare size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">कुनै कार्य जिम्मेवारी बाँकी छैन!</p>
              <p className="text-xs text-gray-400">प्रशासनले कार्य तोकेपछि यहाँ सूची देखिनेछ।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks
                .filter((t) => (taskStatusFilter === 'ALL' ? true : t.status === taskStatusFilter))
                .map((task: any) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const isInProgress = task.status === 'IN_PROGRESS';
                  const isUrgent = task.priority === 'URGENT';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition bg-white shadow-2xs space-y-3 ${
                        isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`text-sm font-extrabold text-gray-900 ${
                                isCompleted ? 'line-through text-gray-400' : ''
                              }`}
                            >
                              {task.title}
                            </h3>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                              {task.category}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                                isUrgent
                                  ? 'bg-rose-100 text-rose-800'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-50 text-blue-800'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-gray-600 font-nepali">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 font-mono">
                            <span>📅 Due: <b>{task.dueDateBs || '—'}</b></span>
                            {task.remarks && <span className="text-purple-800 font-sans font-semibold">Note: {task.remarks}</span>}
                          </div>
                        </div>

                        {/* Status Change Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              updateTaskStatusMutation.mutate({
                                id: task.id,
                                status: isCompleted ? 'PENDING' : isInProgress ? 'COMPLETED' : 'IN_PROGRESS',
                              })
                            }
                            disabled={updateTaskStatusMutation.isPending}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : isInProgress
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            }`}
                          >
                            {isCompleted ? <Check size={14} /> : <Clock size={14} />}
                            <span>
                              {isCompleted
                                ? 'Completed (सम्पन्न भयो ✓)'
                                : isInProgress
                                ? 'In Progress (सञ्चालनमा)'
                                : 'Mark In Progress'}
                            </span>
                          </button>

                          {!isCompleted && (
                            <button
                              onClick={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: 'COMPLETED',
                                })
                              }
                              disabled={updateTaskStatusMutation.isPending}
                              className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition cursor-pointer"
                              title="Mark as Completed directly"
                            >
                              ✓ Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MY TEACHING TIMETABLE / ROUTINE ────────────────────────── */}
      {activeTab === 'routine' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Clock className="text-[#1e3a5f]" size={20} />
                  <span>My Weekly Teaching Schedule (मेरो साप्ताहिक पठनपाठन तालिका)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  शिक्षक: {displayName} — आइतबारदेखि शुक्रबारसम्मको घण्टी तालिका
                </p>
              </div>
            </div>

            {isRoutineLoading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs">रुटिन लोड हुँदैछ...</p>
              </div>
            ) : !teacherRoutine || teacherRoutine.length === 0 ? (
              <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">तपाईंको नाममा कुनै घण्टी तोकिएको छैन।</p>
                <p className="text-xs text-gray-400">प्रशासनले कक्षा रुटिन तयार गरेपछि यहाँ तालिका देखिनेछ।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((day) => {
                  const dayEntries = teacherRoutine.filter((r: any) => r.dayOfWeek === day);
                  return (
                    <div key={day} className="rounded-xl border border-gray-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <span className="font-extrabold text-xs text-[#1e3a5f]">{DAYS_MAP[day]}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {dayEntries.length} Classes
                        </span>
                      </div>

                      {dayEntries.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">कुनै कक्षा छैन (No Period)</p>
                      ) : (
                        <div className="space-y-2">
                          {dayEntries.map((r: any) => (
                            <div
                              key={r.id}
                              className="p-2.5 rounded-lg bg-white border border-gray-100 shadow-2xs text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-gray-900">
                                  घण्टी {r.periodNo} ({r.startTime} - {r.endTime})
                                </span>
                                {r.roomNo && (
                                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                                    Room: {r.roomNo}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-gray-600">
                                <span className="font-bold text-blue-900">{r.class?.name} {r.class?.section ? `(${r.class?.section})` : ''}</span>
                                <span className="text-emerald-700 font-semibold">{r.subject?.name || 'विषय'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MY LEAVE APPLICATIONS ─────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FileText className="text-[#1e3a5f]" size={20} />
                  <span>My Leave Applications (मेरो बिदाको अभिलेख)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  शिक्षकको बिदा केवल प्रधानाध्यापक वा प्रशासनबाट स्वीकृत भएपछि मात्र लागू हुनेछ।
                </p>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <FileText size={14} />
                <span>नयाँ बिदा आवेदन दिनुहोस् (Apply for Leave)</span>
              </button>
            </div>

            {/* Admin call reminder notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 mb-4">
              <PhoneCall size={18} className="text-amber-700 shrink-0" />
              <span>
                <b>सूचना:</b> बिदाको निवेदन दर्ता गरेपछि तत्काल स्वीकृतिका लागि प्रशासन वा प्रधानाध्यापकलाई सम्पर्क गर्नुहोस्।
              </span>
            </div>

            {isMyLeavesLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs">आवेदनहरू लोड हुँदैछन्...</p>
              </div>
            ) : !myLeaves || myLeaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">कुनै बिदा आवेदन फेला परेन।</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myLeaves.map((l: any) => (
                  <div key={l.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">
                          {l.startDateBs} देखि {l.endDateBs} सम्म ({l.totalDays} दिन)
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status === 'APPROVED' ? '✓ स्वीकृत (Approved)' : l.status === 'REJECTED' ? '✕ अस्वीकृत (Rejected)' : '⏳ विचाराधीन (Pending)'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">कारण: {l.reason}</p>
                      {l.reviewedByName && (
                        <p className="text-[11px] text-gray-400">
                          निर्णयकर्ता: {l.reviewedByName} {l.reviewRemarks && `| कैफियत: ${l.reviewRemarks}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400 font-mono">
                        दर्ता मिति: {new Date(l.createdAt).toLocaleDateString()}
                      </span>

                      {l.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLeave(l);
                              setEditLeaveStartDate(l.startDateBs);
                              setEditLeaveEndDate(l.endDateBs);
                              setEditLeaveDaysCount(l.totalDays || 1);
                              setEditLeaveReason(l.reason);
                              setIsEditLeaveModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            ✏️ सम्पादन (Edit)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('के तपाईं यो बिदाको निवेदन रद्द गर्न चाहनुहुन्छ?')) {
                                deleteLeaveMutation.mutate(l.id);
                              }
                            }}
                            disabled={deleteLeaveMutation.isPending}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            🗑️ रद्द (Cancel)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: STUDENT LEAVE APPROVALS (STRICT CLASS TEACHER) ─────────── */}
      {activeTab === 'students_leave' && myAssignedClasses.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <UserCheck className="text-emerald-700" size={20} />
                  <span>Student Leave Requests (मेरो कक्षाका विद्यार्थीहरूको बिदा आवेदन)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  तपाईं कक्षा शिक्षक हुनुभएको कक्षाका विद्यार्थीहरूको बिदा तपाईंले मात्र स्वीकृत गर्न सक्नुहुन्छ।
                </p>
              </div>
            </div>

            {isClassLeavesLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <p className="mt-2 text-xs">विद्यार्थी आवेदनहरू लोड हुँदैछन्...</p>
              </div>
            ) : !studentLeaves || studentLeaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <UserCheck size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">कुनै नयाँ बिदा आवेदन छैन।</p>
                <p className="text-xs text-gray-400">विद्यार्थीहरूले बिदा आवेदन दिएपछि यहाँ देखिनेछ।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentLeaves.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">
                          {l.student?.fullName}
                        </span>
                        <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          {l.class?.name} {l.class?.section ? `(${l.class?.section})` : ''} | Roll #{l.student?.classEnrollment?.[0]?.rollNo || '1'}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status === 'APPROVED' ? '✓ स्वीकृत' : l.status === 'REJECTED' ? '✕ अस्वीकृत' : '⏳ विचाराधीन'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        <b>बिदा अवधि:</b> {l.startDateBs} देखि {l.endDateBs} सम्म ({l.totalDays} दिन)
                      </p>
                      <p className="text-xs text-gray-600">
                        <b>कारण (Reason):</b> {l.reason}
                      </p>
                      {l.reviewedByName && (
                        <p className="text-[11px] text-gray-400">
                          स्वीकृत/अस्वीकृत गर्ने: {l.reviewedByName} {l.reviewRemarks && `(कैफियत: ${l.reviewRemarks})`}
                        </p>
                      )}
                    </div>

                    {l.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => reviewStudentLeaveMutation.mutate({ leaveId: l.id, status: 'APPROVED' })}
                          disabled={reviewStudentLeaveMutation.isPending}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>स्वीकृत (Approve)</span>
                        </button>
                        <button
                          onClick={() => {
                            const remarks = prompt('अस्वीकृत गर्नुको कारण (वैकल्पिक):');
                            reviewStudentLeaveMutation.mutate({ leaveId: l.id, status: 'REJECTED', remarks: remarks || undefined });
                          }}
                          disabled={reviewStudentLeaveMutation.isPending}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <X size={14} />
                          <span>अस्वीकृत (Reject)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: EXAM INCHARGE SUB-PORTAL ─────────────────────────────────── */}
      {activeTab === 'incharge_exam' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-purple-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Award size={14} />
                <span>परीक्षा शाखा नियन्त्रण कक्ष (Examination Department Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Exam Incharge (परीक्षा प्रमुख)'}
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                परीक्षा तालिका निर्माण, प्रवेश पत्र (Admit Card) छपाई, सिट प्लानिङ, प्राप्ताङ्क लेजर तथा नतिजा प्रकाशन व्यवस्थापन
              </p>
            </div>
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center gap-2 bg-white text-purple-950 hover:bg-purple-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Exam Dashboard (पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Exam Incharge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/exams"
              className="p-4 rounded-2xl border border-purple-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition">
                  <Calendar size={20} />
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  तालिका
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Exam Schedules & Routine</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                परीक्षा तालिका, विषय, पूर्णाङ्क तथा समय व्यवस्थापन
              </p>
            </Link>

            <Link
              href="/dashboard/exams/admit-cards"
              className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-110 transition">
                  <Printer size={20} />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  प्रवेश पत्र
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Admit Card Generator</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी परीक्षा प्रवेश पत्र तथा फोटो सहितको कार्ड छपाई
              </p>
            </Link>

            <Link
              href="/dashboard/exams/seat-planning"
              className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  सिट योजना
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Seat Planning & Halls</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                रोल नम्बर अनुसार सिट योजना, हल र डेस्क स्लिप
              </p>
            </Link>

            <Link
              href="/dashboard/certificates"
              className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <Award size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  प्रमाणपत्र
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Certificates & Character</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                चारित्रिक प्रमाणपत्र तथा स्थानान्तरण प्रमाणपत्र (TC)
              </p>
            </Link>
          </div>

          {/* Active Exams & Tasks List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                  <Award size={16} className="text-purple-700" />
                  <span>Active Examinations (चालु तथा आगामी परीक्षाहरू)</span>
                </h3>
                <Link
                  href="/dashboard/exams"
                  className="text-[11px] font-bold text-purple-700 hover:underline"
                >
                  Manage All →
                </Link>
              </div>

              {examsData?.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs bg-slate-50 rounded-xl">
                  कुनै सक्रिय परीक्षा फेला परेन।
                </div>
              ) : (
                <div className="space-y-2.5">
                  {examsData?.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-extrabold text-xs text-purple-950">
                          {exam.name} {exam.nameNepali ? `(${exam.nameNepali})` : ''}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          📅 {exam.startDateBs} देखि {exam.endDateBs} सम्म • Shift: {exam.shift || 'DAY'}
                        </p>
                        <p className="text-[10px] text-purple-800 font-bold mt-1">
                          कक्षा: {exam.examClasses?.map((ec: any) => ec.class?.name).join(', ') || 'सबै कक्षा'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <Link
                          href="/dashboard/exams/admit-cards"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition"
                        >
                          🪪 Admit Cards
                        </Link>
                        <Link
                          href="/dashboard/exams/seat-planning"
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] font-bold text-[10px] shadow-2xs transition"
                        >
                          🪑 Seat Plan
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exam Duties / Tasks */}
            <div className="lg:col-span-5 rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                  <CheckSquare size={16} className="text-purple-700" />
                  <span>Exam Incharge Duties (परीक्षा जिम्मेवारी)</span>
                </h3>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {myTasksData?.filter((t: any) => t.category === 'EXAM' && t.status !== 'COMPLETED').length} Pending
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {myTasksData?.filter((t: any) => t.category === 'EXAM').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">कुनै परीक्षा कार्य तोकिएको छैन।</p>
                ) : (
                  myTasksData
                    ?.filter((t: any) => t.category === 'EXAM')
                    .map((task: any) => {
                      const isDone = task.status === 'COMPLETED';
                      return (
                        <div
                          key={task.id}
                          className={`p-2.5 rounded-xl border text-xs transition ${
                            isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() =>
                                  updateTaskStatusMutation.mutate({
                                    id: task.id,
                                    status: isDone ? 'PENDING' : 'COMPLETED',
                                  })
                                }
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              />
                              <div>
                                <span className={`font-bold block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {task.title}
                                </span>
                                {task.description && (
                                  <span className="text-[10px] text-gray-500 block">{task.description}</span>
                                )}
                              </div>
                            </label>
                            <span className="text-[9px] font-mono font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded shrink-0">
                              {task.dueDateBs}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: LIBRARY INCHARGE SUB-PORTAL ───────────────────────────────── */}
      {activeTab === 'incharge_library' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-blue-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <BookOpen size={14} />
                <span>पुस्तकालय व्यवस्थापन कक्ष (Library Department Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Librarian Incharge (पुस्तकालय प्रमुख)'}
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                पुस्तक दर्ता तथा वर्गीकरण, विद्यार्थी तथा शिक्षकलाई पुस्तक वितरण (Issue), फिर्ता (Return) र जरिवाना हिसाब
              </p>
            </div>
            <Link
              href="/dashboard/library"
              className="inline-flex items-center gap-2 bg-white text-blue-950 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Library Dashboard (पुस्तकालय पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Library Incharge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-blue-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition">
                  <BookOpen size={22} />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  पुस्तक सूची
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Book Catalog & Inventory</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                सबै पुस्तकहरूको सूची, वर्गीकरण, लेखक र नयाँ पुस्तक प्रविष्टि
              </p>
            </Link>

            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <Users size={22} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  जारी (Issue)
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Issue Books to Students / Staff</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी तथा शिक्षकलाई पुस्तक जारी, बारकोड स्क्यान र म्याद
              </p>
            </Link>

            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-amber-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                  <Clock size={22} />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  फिर्ता र जरिवाना
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Book Returns & Overdue Tracker</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                पुस्तक फिर्ता लिने, समय नाघेका किताबहरू र जरिवाना हिसाब
              </p>
            </Link>
          </div>

          {/* Library Duties / Tasks */}
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-blue-700" />
                <span>Library Incharge Duties (पुस्तकालय जिम्मेवारी तथा कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'LIBRARY' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'LIBRARY').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै पुस्तकालय कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'LIBRARY')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ACCOUNTANT INCHARGE SUB-PORTAL ────────────────────────────── */}
      {activeTab === 'incharge_account' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-emerald-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <DollarSign size={14} />
                <span>लेखा तथा आर्थिक प्रशासन कक्ष (Finance & Account Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Accountant / Finance Incharge (लेखापाल / लेखा प्रमुख)'}
              </h2>
              <p className="text-xs text-emerald-200 mt-1">
                विद्यार्थी शुल्क संकलन र बिलिङ, दैनिक खर्च प्रविष्टि, कर्मचारी तलब भुक्तानी तथा आय-व्यय प्रतिवेदन
              </p>
            </div>
            <Link
              href="/dashboard/finance"
              className="inline-flex items-center gap-2 bg-white text-emerald-950 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Finance Portal (लेखा पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Accountant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/finance/fees"
              className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <DollarSign size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  शुल्क
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Student Fee Collection</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी मासिक शुल्क संकलन, बिलिङ र रसिद छपाई
              </p>
            </Link>

            <Link
              href="/dashboard/finance/expenses"
              className="p-4 rounded-2xl border border-rose-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 group-hover:scale-110 transition">
                  <FileText size={20} />
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                  खर्च
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Expense Vouchers & Bills</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                दैनिक विद्यालय खर्च प्रविष्टि, भौचर र भुक्तानी
              </p>
            </Link>

            <Link
              href="/dashboard/finance/payroll"
              className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-110 transition">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  तलब
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Staff Payroll & Salaries</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                कर्मचारी तलब शिट, सञ्चय कोष र पे-स्लिप
              </p>
            </Link>

            <Link
              href="/dashboard/finance/reports"
              className="p-4 rounded-2xl border border-blue-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition">
                  <FileSpreadsheet size={20} />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  प्रतिवेदन
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Financial Reports & Audit</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                आम्दानी-खर्च, ब्यालेन्स सिट तथा अडिट रिपोर्ट
              </p>
            </Link>
          </div>

          {/* Account Duties / Tasks */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-700" />
                <span>Accounting Duties (लेखा जिम्मेवारी तथा कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'ACCOUNT' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'ACCOUNT').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै लेखा कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'ACCOUNT')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: COORDINATION & SPECIAL INCHARGE SUB-PORTAL ────────────────── */}
      {activeTab === 'incharge_coordinator' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-indigo-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Layers size={14} />
                <span>विभागीय तथा शैक्षिक समन्वय कक्ष (Department Coordination Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Academic & Incharge Coordinator'}
              </h2>
              <p className="text-xs text-indigo-200 mt-1">
                शैक्षिक योजना, घण्टी तालिका समन्वय, अनुशासन तथा अतिरिक्त क्रियाकलाप अनुगमन
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-indigo-950 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full ERP Modules (प्रशासनिक पहुँच)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Coordinator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/classes/routine"
              className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-110 transition">
                  <Clock size={20} />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  रुटिन
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Master Class Routines</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                सम्पूर्ण विद्यालयको कक्षा तथा शिक्षक घण्टी तालिका
              </p>
            </Link>

            <Link
              href="/dashboard/teachers"
              className="p-4 rounded-2xl border border-purple-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  शिक्षक
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Faculty & Staff Directory</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                शिक्षक तथा कर्मचारी नामावली र जिम्मेवारी
              </p>
            </Link>

            <Link
              href="/dashboard/students"
              className="p-4 rounded-2xl border border-blue-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition">
                  <GraduationCap size={20} />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  विद्यार्थी
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Student Directory & Classes</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                कक्षागत विद्यार्थी सूची, EMIS तथा प्रोफाइल
              </p>
            </Link>

            <Link
              href="/dashboard/notices"
              className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                  <Send size={20} />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  सूचना
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Broadcast Notice / SMS</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यालयव्यापी सूचना तथा SMS सम्प्रेषण
              </p>
            </Link>
          </div>

          {/* Coordination Duties / Tasks */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-indigo-700" />
                <span>Coordinator Duties & Responsibilities (समन्वय कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'ACADEMIC' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'ACADEMIC' || t.category === 'GENERAL').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै समन्वय कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'ACADEMIC' || t.category === 'GENERAL')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: APPLY FOR TEACHER LEAVE ───────────────────────────────── */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Apply for Teacher Leave (बिदाको निवेदन)</h3>
                <p className="text-xs text-gray-500">प्रधानाध्यापक तथा प्रशासन समक्ष बिदाको निवेदन पेश गर्नुहोस्</p>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyLeaveMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <b>स्मरण रहोस्:</b> बिदा दर्ता भएपछि तुरुन्त स्वीकृतिका लागि प्रशासनलाई सम्पर्क गर्नुहोस्।
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-10"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-12"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कुल दिन संख्या (Total Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={leaveDaysCount}
                  onChange={(e) => setLeaveDaysCount(parseInt(e.target.value) || 1)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन (Reason / Application) *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="श्री प्रधानाध्यापक ज्यू, मलाई घरायसी अत्यावश्यक काम परेको हुनाले मिति... देखि... सम्म बिदा पाउन निवेदन गर्दछु।"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white disabled:opacity-60 cursor-pointer"
                >
                  {applyLeaveMutation.isPending ? 'दर्ता हुँदैछ...' : 'बिदा निवेदन बुझाउनुहोस् (Submit)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT TEACHER LEAVE ────────────────────────────────────── */}
      {isEditLeaveModalOpen && editingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Edit Teacher Leave (बिदाको निवेदन सम्पादन)</h3>
                <p className="text-xs text-gray-500">प्रशासनले निर्णय लिनु अघि विवरण परिमार्जन गर्नुहोस्</p>
              </div>
              <button
                onClick={() => {
                  setIsEditLeaveModalOpen(false);
                  setEditingLeave(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLeaveMutation.mutate({
                  id: editingLeave.id,
                  data: {
                    startDateBs: editLeaveStartDate,
                    endDateBs: editLeaveEndDate,
                    totalDays: editLeaveDaysCount,
                    reason: editLeaveReason,
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-10"
                    value={editLeaveStartDate}
                    onChange={(e) => setEditLeaveStartDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-12"
                    value={editLeaveEndDate}
                    onChange={(e) => setEditLeaveEndDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कुल दिन संख्या (Total Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editLeaveDaysCount}
                  onChange={(e) => setEditLeaveDaysCount(parseInt(e.target.value) || 1)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन (Reason / Application) *</label>
                <textarea
                  required
                  rows={4}
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditLeaveModalOpen(false);
                    setEditingLeave(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={updateLeaveMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white disabled:opacity-60 cursor-pointer"
                >
                  {updateLeaveMutation.isPending ? 'सुरक्षित हुँदैछ...' : 'परिमार्जन सुरक्षित गर्नुहोस् (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: SEND CLASS NOTICE ────────────────────────────────────── */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Send Notice to Class (कक्षालाई सूचना)</h3>
                <p className="text-xs text-gray-500">Notice will appear in student/parent portals.</p>
              </div>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendNoticeMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Class *</label>
                <select
                  required
                  value={noticeTargetClassId}
                  onChange={(e) => setNoticeTargetClassId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="">Select Target Class</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Unit Test Announcement / Homework Notice"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type notice message to students..."
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Send SMS to Parents (Sparrow SMS)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendNoticeMutation.isPending}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 font-bold text-[#1e3a5f] disabled:opacity-60"
                >
                  {sendNoticeMutation.isPending ? 'Sending...' : 'Dispatch Notice (सूचना पठाउनुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: REPORT PROBLEM TO ADMIN ──────────────────────────────── */}
      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-rose-700">Report Problem to Admin (प्रशासनलाई समस्या वा माग)</h3>
                <p className="text-xs text-gray-500">Send an issue directly to the Principal and School Management.</p>
              </div>
              <button onClick={() => setIsProblemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reportProblemMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Issue Category *</label>
                  <select
                    value={problemCategory}
                    onChange={(e) => setProblemCategory(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="FACILITIES">Classroom / Facility (कोठा तथा पूर्वाधार)</option>
                    <option value="TEACHING_MATERIALS">Teaching Materials (शैक्षिक सामग्री / मार्कर)</option>
                    <option value="DISCIPLINE">Student Discipline (विद्यार्थी अनुशासन)</option>
                    <option value="LEAVE_REQUEST">Leave / Substitute (बिदा तथा सट्टा शिक्षक)</option>
                    <option value="OTHER">Other Issue (अन्य समस्या)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Urgency / Priority *</label>
                  <select
                    value={problemPriority}
                    onChange={(e) => setProblemPriority(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="NORMAL">Normal Priority (सामान्य)</option>
                    <option value="URGENT">Urgent (तत्काल समाधान आवश्यक)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Problem Subject / Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Whiteboard damaged in Class 9 / Need Science Lab chemicals"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the problem in detail and what assistance is needed from the Principal/Admin..."
                  value={problemBody}
                  onChange={(e) => setProblemBody(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProblemModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportProblemMutation.isPending}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-bold text-white disabled:opacity-60"
                >
                  {reportProblemMutation.isPending ? 'Submitting...' : 'Submit Report to Admin (प्रतिवेदन बुझाउनुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT TEACHER PROFILE MODAL ────────────────────────────────────── */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f]">
                ✏️ Edit My Profile Details (शिक्षक विवरण सम्पादन)
              </h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name (पुरा नाम)</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (फोन नं.)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email (इमेल)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Address (ठेगाना)</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PAN Number (पान नं.)</label>
                  <input
                    type="text"
                    value={editPanNo}
                    onChange={(e) => setEditPanNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
