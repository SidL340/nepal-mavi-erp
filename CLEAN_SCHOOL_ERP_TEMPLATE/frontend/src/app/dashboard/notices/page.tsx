'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Send,
  X,
  AlertTriangle,
  BookOpen,
  Users,
  User,
  GraduationCap,
  Calendar,
  Megaphone,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Filter,
  School,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; borderColor: string }> = {
  GENERAL:      { label: 'General',       color: 'text-slate-800',   bg: 'bg-slate-100',   icon: Megaphone,     borderColor: 'border-l-slate-400'   },
  CLASS:        { label: 'Class',         color: 'text-blue-800',    bg: 'bg-blue-100',    icon: School,        borderColor: 'border-l-blue-500'    },
  INDIVIDUAL:   { label: 'Individual',    color: 'text-violet-800',  bg: 'bg-violet-100',  icon: User,          borderColor: 'border-l-violet-500'  },
  ABSENT_ALERT: { label: 'Absent Alert',  color: 'text-rose-800',    bg: 'bg-rose-100',    icon: AlertTriangle, borderColor: 'border-l-rose-500'    },
  EXAM:         { label: 'Exam',          color: 'text-purple-800',  bg: 'bg-purple-100',  icon: BookOpen,      borderColor: 'border-l-purple-500'  },
  EVENT:        { label: 'Event',         color: 'text-emerald-800', bg: 'bg-emerald-100', icon: Calendar,      borderColor: 'border-l-emerald-500' },
  TEACHER:      { label: 'Teachers',      color: 'text-amber-800',   bg: 'bg-amber-100',   icon: GraduationCap, borderColor: 'border-l-amber-500'   },
  FEE_REMINDER: { label: 'Fee Reminder',  color: 'text-orange-800',  bg: 'bg-orange-100',  icon: Bell,          borderColor: 'border-l-orange-500'  },
};

export default function NoticesPage() {
  const { user } = useAuthStore();
  const canPublish = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'].includes(user?.role || '');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');
  const queryClient = useQueryClient();

  // Filter state
  const [filterType, setFilterType] = useState('');

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAbsentAlertOpen, setIsAbsentAlertOpen] = useState(false);
  const [isExamAlertOpen, setIsExamAlertOpen] = useState(false);

  // Edit modal state
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editType, setEditType] = useState('GENERAL');

  // Compose form state
  const [noticeType, setNoticeType] = useState('GENERAL');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStudentSearch, setTargetStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [sendSms, setSendSms] = useState(false);

  // Absent alert state
  const [absentClassId, setAbsentClassId] = useState('');
  const [absentDateBs, setAbsentDateBs] = useState(todayBS());
  const [absentCustomMsg, setAbsentCustomMsg] = useState('');
  const [absentPreviewList, setAbsentPreviewList] = useState<any[]>([]);
  const [absentPreviewFetched, setAbsentPreviewFetched] = useState(false);

  // Exam alert state
  const [examTitle, setExamTitle] = useState('');
  const [examBody, setExamBody] = useState('');
  const [examClassId, setExamClassId] = useState('');

  // ── DATA QUERIES ─────────────────────────────────────────────────────────

  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['notices', filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      const res = await api.get(`/notices?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const { data: studentsList } = useQuery({
    queryKey: ['students-notice-search', targetStudentSearch],
    queryFn: async () => {
      if (targetStudentSearch.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(targetStudentSearch)}&limit=6`);
      return res.data?.data || [];
    },
    enabled: targetStudentSearch.length >= 2,
  });

  // Absent students preview fetch
  const fetchAbsentPreview = async () => {
    if (!absentClassId || !absentDateBs) {
      toast.error('Select a class and date first.');
      return;
    }
    try {
      const res = await api.get(`/attendance/class/${absentClassId}?dateBs=${absentDateBs}`);
      const students = res.data?.data || [];
      const absent = students.filter((s: any) => s.status === 'ABSENT' || s.status === 'BUNKED');
      setAbsentPreviewList(absent);
      setAbsentPreviewFetched(true);
      if (absent.length === 0) {
        toast('No absent students found for the selected date & class.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Could not fetch attendance data.');
    }
  };

  // ── MUTATIONS ────────────────────────────────────────────────────────────

  const createNoticeMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/notices', {
        ...formData,
        type: noticeType,
        targetClassId: noticeType === 'CLASS' ? targetClassId : null,
        targetStudentId: noticeType === 'INDIVIDUAL' ? selectedStudent?.id : null,
        postedDateBs: todayBS(),
        sendSms,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice published successfully!');
      setIsComposeOpen(false);
      setSelectedStudent(null);
      setTargetStudentSearch('');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish notice'),
  });

  const updateNoticeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/notices/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice updated successfully!');
      setEditingNotice(null);
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update notice'),
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const res = await api.post(`/notices/${id}/delete`);
        return res.data;
      } catch {
        const res = await api.delete(`/notices/${id}`);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success('Notice removed.');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete notice'),
  });

  const absentAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notices/absent-alert', {
        classId: absentClassId,
        dateBs: absentDateBs,
        customMessage: absentCustomMsg || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Absent alerts sent for ${data.count} student(s)!`);
      setIsAbsentAlertOpen(false);
      setAbsentPreviewList([]);
      setAbsentPreviewFetched(false);
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send absent alerts'),
  });

  const examAlertMutation = useMutation({
    mutationFn: async () => {
      if (!examTitle || !examBody) throw new Error('Title and body are required.');
      const res = await api.post('/notices/exam-alert', {
        title: examTitle,
        body: examBody,
        classId: examClassId || undefined,
        postedDateBs: todayBS(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Exam notice published!');
      setIsExamAlertOpen(false);
      setExamTitle('');
      setExamBody('');
      setExamClassId('');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish exam notice'),
  });

  const openEditModal = (notice: any) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditBody(notice.body);
    setEditType(notice.type);
  };

  const notices = noticesData || [];
  const totalCount = notices.length;
  const absentCount = notices.filter((n: any) => n.type === 'ABSENT_ALERT').length;
  const examCount = notices.filter((n: any) => n.type === 'EXAM').length;

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="rounded-xl bg-[#1e3a5f] p-2 text-white shadow-md">
              <Bell size={20} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
              Notice Board & Alerts (सूचना प्रणाली)
            </h1>
          </div>
          <p className="text-xs text-gray-500 ml-11">
            Publish notices, send absent alerts, and exam announcements to students, classes & guardians
          </p>
        </div>

        {canPublish && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['notices'] });
                toast.success('Refreshed!');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-slate-50 shadow-2xs transition"
            >
              <RefreshCw size={13} />
              Refresh
            </button>

            <button
              onClick={() => setIsAbsentAlertOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <AlertTriangle size={14} />
              Send Absent Alert
            </button>

            <button
              onClick={() => setIsExamAlertOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <BookOpen size={14} />
              Exam Notice
            </button>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <Plus size={14} />
              Compose Notice
            </button>
          </div>
        )}
      </div>

      {/* ── STATS CARDS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Notices', value: totalCount, icon: Bell, color: 'text-[#1e3a5f]', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Absent Alerts', value: absentCount, icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          { label: 'Exam Notices', value: examCount, icon: BookOpen, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
          { label: 'General', value: notices.filter((n: any) => n.type === 'GENERAL').length, icon: Megaphone, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex items-center gap-3 shadow-2xs`}>
            <div className={`rounded-xl ${stat.bg} p-2 border ${stat.border}`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: '', label: 'All Notices' },
          { key: 'GENERAL', label: 'General' },
          { key: 'CLASS', label: 'Class' },
          { key: 'INDIVIDUAL', label: 'Individual' },
          { key: 'ABSENT_ALERT', label: 'Absent Alert' },
          { key: 'EXAM', label: 'Exam' },
          { key: 'EVENT', label: 'Event' },
          { key: 'TEACHER', label: 'Teachers' },
        ].map((t) => {
          const cfg = t.key ? TYPE_CONFIG[t.key] : null;
          return (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${
                filterType === t.key
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {t.key && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 font-mono text-[9px]">
                  {notices.filter((n: any) => n.type === t.key).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── NOTICES FEED ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <Bell size={28} className="mx-auto text-gray-300 mb-2 animate-pulse" />
            <p className="text-sm font-semibold">Loading notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
            <Bell size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No notices found</p>
            <p className="text-xs text-gray-400 mt-1">
              {filterType ? `No "${filterType}" notices yet.` : 'No notices published yet. Click "Compose Notice" to create one.'}
            </p>
          </div>
        ) : (
          notices.map((n: any) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['GENERAL'];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`rounded-2xl border border-gray-100 bg-white shadow-2xs border-l-4 ${cfg.borderColor} p-5 transition hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon Badge */}
                    <div className={`mt-0.5 shrink-0 rounded-xl p-1.5 ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Meta line */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {n.isAutomatic && (
                          <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[9px] font-bold">
                            Auto
                          </span>
                        )}
                        {n.targetClass && (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            📚 {n.targetClass.name}
                          </span>
                        )}
                        {n.targetStudent && (
                          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                            👤 {n.targetStudent.fullName}
                          </span>
                        )}
                      </div>

                      {/* Title & Body */}
                      <h3 className="text-sm font-extrabold text-gray-900 mb-1">{n.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{n.body}</p>

                      {/* Footer date */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-mono">{n.postedDateBs} BS</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions — Edit & Delete (Admin only) */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(n)}
                        className="rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 p-1.5 transition"
                        title="Edit Notice"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete notice: "${n.title}"?`)) {
                            deleteNoticeMutation.mutate(n.id);
                          }
                        }}
                        className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 p-1.5 transition"
                        title="Delete Notice"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ── COMPOSE NOTICE MODAL ─────────────────────────────────────────────── */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-[#1e3a5f]" />
                <h2 className="text-base font-bold text-[#1e3a5f]">Compose & Publish Notice</h2>
              </div>
              <button onClick={() => setIsComposeOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data: any = {};
                fd.forEach((v, k) => { if (v) data[k] = v; });
                createNoticeMutation.mutate(data);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Audience *</label>
                <select
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GENERAL">🏫 Whole School (सबैका लागि)</option>
                  <option value="CLASS">📚 Specific Class</option>
                  <option value="INDIVIDUAL">👤 Individual Student</option>
                  <option value="TEACHER">👩‍🏫 All Teachers</option>
                  <option value="EVENT">📅 Event / Program</option>
                  <option value="FEE_REMINDER">💰 Fee Reminder</option>
                </select>
              </div>

              {noticeType === 'CLASS' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Class *</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white"
                  >
                    <option value="">Select Target Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {noticeType === 'INDIVIDUAL' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Search Student *</label>
                  {selectedStudent ? (
                    <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-2.5">
                      <div>
                        <p className="font-bold text-[#1e3a5f] text-xs">{selectedStudent.fullName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">Contact: {selectedStudent.guardianContact || 'N/A'}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-rose-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Type student name to search..."
                        value={targetStudentSearch}
                        onChange={(e) => setTargetStudentSearch(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                      />
                      {studentsList && studentsList.length > 0 && (
                        <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
                          {studentsList.map((st: any) => (
                            <div
                              key={st.id}
                              onClick={() => { setSelectedStudent(st); setTargetStudentSearch(''); }}
                              className="flex cursor-pointer items-center justify-between p-2.5 hover:bg-blue-50 transition"
                            >
                              <span className="font-bold text-gray-900 text-xs">{st.fullName}</span>
                              <span className="font-mono text-[10px] text-gray-400">{st.studentId}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Title *</label>
                <input required name="title" type="text" placeholder="Notice headline..." className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content / Message *</label>
                <textarea required name="body" rows={4} placeholder="Detailed announcement text..." className="w-full rounded-xl border border-gray-300 p-2.5 text-xs leading-relaxed" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                  <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="rounded" />
                  <span>Also send via Sparrow SMS to guardian mobile</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button type="button" onClick={() => setIsComposeOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600">
                  Cancel
                </button>
                <button type="submit" disabled={createNoticeMutation.isPending} className="rounded-xl bg-[#1e3a5f] px-5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] disabled:opacity-60">
                  {createNoticeMutation.isPending ? 'Publishing...' : '📢 Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ── EDIT NOTICE MODAL ────────────────────────────────────────────────── */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-[#1e3a5f]">Edit Notice</h2>
              </div>
              <button onClick={() => setEditingNotice(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white font-semibold"
                >
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Content *</label>
                <textarea
                  rows={5}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button onClick={() => setEditingNotice(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!editTitle || !editBody) { toast.error('Title and body are required.'); return; }
                  updateNoticeMutation.mutate({ id: editingNotice.id, payload: { title: editTitle, body: editBody, type: editType } });
                }}
                disabled={updateNoticeMutation.isPending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {updateNoticeMutation.isPending ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ── ABSENT ALERT MODAL ───────────────────────────────────────────────── */}
      {isAbsentAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <h2 className="text-base font-bold text-[#1e3a5f]">Send Absent Alerts (अनुपस्थिति सूचना)</h2>
              </div>
              <button onClick={() => { setIsAbsentAlertOpen(false); setAbsentPreviewList([]); setAbsentPreviewFetched(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-500 text-xs leading-relaxed bg-rose-50 border border-rose-100 rounded-xl p-3">
                This will create individual <strong>ABSENT_ALERT</strong> notices for each absent student on the selected date &amp; class and optionally send SMS to their guardian's mobile.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Class *</label>
                  <select
                    value={absentClassId}
                    onChange={(e) => { setAbsentClassId(e.target.value); setAbsentPreviewFetched(false); setAbsentPreviewList([]); }}
                    className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-xs"
                  >
                    <option value="">Choose Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date BS *</label>
                  <input
                    type="text"
                    value={absentDateBs}
                    onChange={(e) => { setAbsentDateBs(e.target.value); setAbsentPreviewFetched(false); setAbsentPreviewList([]); }}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Custom Message (Optional)</label>
                <textarea
                  rows={3}
                  value={absentCustomMsg}
                  onChange={(e) => setAbsentCustomMsg(e.target.value)}
                  placeholder="Leave blank for auto-generated message: 'Dear Guardian, your ward [Name] was ABSENT on [Date]...'"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs leading-relaxed"
                />
              </div>

              {/* Preview Step */}
              {!absentPreviewFetched ? (
                <button
                  type="button"
                  onClick={fetchAbsentPreview}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition"
                >
                  🔍 Preview Absent Students
                </button>
              ) : (
                <div className="space-y-2">
                  {absentPreviewList.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-xs">No absent students found for selected class &amp; date.</div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-rose-700 mb-2">
                        ⚠️ {absentPreviewList.length} absent student(s) found — alerts will be sent individually:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {absentPreviewList.map((s: any) => (
                          <div key={s.studentId || s.id} className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                            <span className="font-bold text-rose-900 text-xs">{s.student?.fullName || s.fullName}</span>
                            <span className="font-mono text-[10px] text-rose-600">{s.status}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => absentAlertMutation.mutate()}
                        disabled={absentAlertMutation.isPending}
                        className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-60 transition mt-1"
                      >
                        {absentAlertMutation.isPending
                          ? 'Sending alerts...'
                          : `📢 Send ${absentPreviewList.length} Absent Alert(s) Now`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ── EXAM NOTICE MODAL ────────────────────────────────────────────────── */}
      {isExamAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-purple-600" />
                <h2 className="text-base font-bold text-[#1e3a5f]">Send Exam Notice (परीक्षा सूचना)</h2>
              </div>
              <button onClick={() => setIsExamAlertOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-500 text-xs bg-purple-50 border border-purple-100 rounded-xl p-3 leading-relaxed">
                Publish a dedicated <strong>EXAM</strong> type notice visible only under the Exam filter tab. Optionally target a specific class or leave blank to notify all students.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Class (Optional — leave blank for all students)</label>
                <select
                  value={examClassId}
                  onChange={(e) => setExamClassId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-xs"
                >
                  <option value="">All Students (सबै विद्यार्थी)</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Exam Notice Title *</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. Terminal Examination Schedule Notice"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Exam Notice Content *</label>
                <textarea
                  rows={5}
                  value={examBody}
                  onChange={(e) => setExamBody(e.target.value)}
                  placeholder="Dear Students, the 1st Terminal Examination will commence from... All students are advised to..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button onClick={() => setIsExamAlertOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => examAlertMutation.mutate()}
                disabled={examAlertMutation.isPending}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {examAlertMutation.isPending ? 'Publishing...' : '📚 Publish Exam Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
