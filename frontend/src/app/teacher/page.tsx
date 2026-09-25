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

  const [activeTab, setActiveTab] = useState<'overview' | 'routine' | 'leaves' | 'students_leave'>('overview');
  const [dailyLog, setDailyLog] = useState('');
  const [selectedClassLog, setSelectedClassLog] = useState('');

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
          <div className="flex items-center gap-2 mt-2">
            <h1 className="text-2xl font-extrabold">Welcome, {displayName}!</h1>
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
              className="ml-auto px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 shadow-xs transition"
            >
              <span>✏️ Edit Profile</span>
            </button>
          </div>
          <p className="text-xs text-blue-200 mt-0.5 font-nepali">
            शिक्षक पोर्टल: दैनिक हाजिरी, प्राप्ताङ्क प्रविष्टि, कक्षा रुटिन, बिदा आवेदन तथा विद्यार्थी बिदा स्वीकृति
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-bold text-[#1e3a5f] transition shadow-sm inline-flex items-center gap-1.5"
          >
            <FileText size={14} />
            <span>Apply for Leave (बिदाको निवेदन)</span>
          </button>
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="rounded-xl bg-rose-500/90 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            ⚠️ Report Issue to Admin
          </button>
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="rounded-xl bg-white/20 hover:bg-white/30 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
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
          <BookOpen size={15} />
          <span>Dashboard & Diary</span>
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
          <span>My Teaching Timetable (मेरो घण्टी तालिका)</span>
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
          <span>My Leave Applications (मेरो बिदा)</span>
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
            <span>Student Leave Approvals (विद्यार्थी बिदा स्वीकृति)</span>
            {pendingStudentLeavesCount > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {pendingStudentLeavesCount}
              </span>
            )}
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

              <form onSubmit={handleSaveLog} className="space-y-3 text-xs">
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
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-sm"
                >
                  <Save size={14} />
                  <span>Save Lesson Diary (डायरी सुरक्षित)</span>
                </button>
              </form>
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

                    <span className="text-[11px] text-gray-400">
                      दर्ता मिति: {new Date(l.createdAt).toLocaleDateString()}
                    </span>
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
