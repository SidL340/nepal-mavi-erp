'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  X,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

export default function TeacherPortalPage() {
  const { user } = useAuthStore();
  const [dailyLog, setDailyLog] = useState('');
  const [selectedClassLog, setSelectedClassLog] = useState('');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);

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

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Notices & Reports
  const { data: noticesData } = useQuery({
    queryKey: ['notices-teacher'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // Fetch Exams created by Admin
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Send Notice Mutation
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

  // Report Problem to Admin Mutation
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
  const teacherId = user?.teacher?.id;
  const myAssignedClasses = classesData?.filter((c: any) => c.classTeacherId === teacherId) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] to-[#2a5280] p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300 mb-2">
            <Calendar size={13} />
            <span>BS {todayBSFormatted()}</span>
          </div>
          <h1 className="text-2xl font-extrabold">Welcome, {displayName}!</h1>
          <p className="text-xs text-blue-200 mt-0.5 font-nepali">
            शिक्षक पोर्टल: आजको कक्षा हाजिरी लिनुहोस्, अङ्क प्रविष्टि गर्नुहोस्, कक्षामा सूचना पठाउनुहोस् वा प्रशासनलाई समस्या दर्ता गर्नुहोस्
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="rounded-xl bg-rose-500/90 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            ⚠️ Report Issue to Admin
          </button>
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-[#1e3a5f] hover:bg-amber-300 transition shadow-sm"
          >
            📢 Send Class Notice
          </button>
        </div>
      </div>

      {/* Assigned Class Banner (if class teacher) */}
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

          <Link
            href="/dashboard/attendance"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition"
          >
            Take Today's Attendance →
          </Link>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/attendance"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition flex items-center gap-4 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
            <CalendarCheck size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Daily Attendance</h3>
            <p className="text-xs text-gray-400 font-nepali">कक्षा शिक्षक हाजिरी</p>
          </div>
        </Link>

        <Link
          href="/dashboard/exams"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition flex items-center gap-4 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Exam Marks Entry</h3>
            <p className="text-xs text-gray-400 font-nepali">विषय शिक्षक प्राप्ताङ्क प्रविष्टि</p>
          </div>
        </Link>

        <button
          onClick={() => setIsNoticeModalOpen(true)}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition flex items-center gap-4 group text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Send Class Notice</h3>
            <p className="text-xs text-gray-400 font-nepali">आफ्नो कक्षालाई सूचना पठाउनुहोस्</p>
          </div>
        </button>
      </div>

      {/* ─── ACADEMIC CALENDAR & EVENT SCHEDULE ───────────────────────────── */}
      <AcademicCalendar />

      {/* ─── ACTIVE EXAMINATIONS (Scheduled by Admin) ──────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Active Examinations (प्रशासनद्वारा सिर्जना गरिएका परीक्षाहरू)</h2>
              <p className="text-[11px] text-gray-500 font-nepali">प्रशासनले सिर्जना गरेको परीक्षा छनौट गरी आफ्नो विषयको प्राप्ताङ्क प्रविष्टि गर्नुहोस्</p>
            </div>
          </div>
          <Link
            href="/dashboard/exams"
            className="text-xs font-bold text-purple-700 hover:underline"
          >
            All Exams & Ledgers →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {!examsData?.length ? (
            <div className="col-span-full py-6 text-center text-xs text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
              No active exams scheduled by administration yet.
            </div>
          ) : (
            examsData.map((exam: any) => (
              <div
                key={exam.id}
                className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-2 hover:border-purple-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">{exam.name}</h3>
                    {exam.nameNepali && (
                      <p className="text-[11px] text-gray-500 font-nepali">{exam.nameNepali}</p>
                    )}
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {exam.startDateBs || 'N/A'} ~ {exam.endDateBs || 'N/A'}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                    ✓ Active Exam
                  </span>
                </div>

                <div className="border-t border-purple-100 pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-600 font-nepali">प्राप्ताङ्क भर्नुहोस्:</span>
                  <Link
                    href={`/dashboard/exams?examId=${exam.id}&tab=marks`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] hover:bg-[#2a5280] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition"
                  >
                    Enter Marks →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Grid: Teaching Diary & My Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Teaching Diary (What I Taught Today) */}
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

        {/* Right 5 Cols: My Assigned Classes & Announcements */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <School size={16} className="text-blue-600" />
              <span>School Announcements & My Notices</span>
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
    </div>
  );
}
