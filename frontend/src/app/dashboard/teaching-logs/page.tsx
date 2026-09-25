'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  School,
  Search,
  Filter,
  Plus,
  Printer,
  Sparkles,
  CheckCircle2,
  FileText,
  Trash2,
  Edit,
  X,
  Layers,
  Award,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function AdminTeachingLogsPage() {
  const queryClient = useQueryClient();

  const [filterDateBs, setFilterDateBs] = useState<string>(todayBS());
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterTeacherId, setFilterTeacherId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);

  // Form State
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formSubjectName, setFormSubjectName] = useState<string>('');
  const [formDateBs, setFormDateBs] = useState<string>(todayBS());
  const [formPeriodNo, setFormPeriodNo] = useState<number | ''>(1);
  const [formTopicTaught, setFormTopicTaught] = useState<string>('');
  const [formLearningOutcome, setFormLearningOutcome] = useState<string>('');
  const [formHomework, setFormHomework] = useState<string>('');
  const [formTeachingMethod, setFormTeachingMethod] = useState<string>('व्याख्या तथा छलफल (Lecture & Discussion)');
  const [formStudentFeedback, setFormStudentFeedback] = useState<string>('विद्यार्थीहरूको सक्रिय सहभागिता रह्यो (Active participation)');
  const [formStatus, setFormStatus] = useState<string>('COMPLETED');
  const [formSubstituteName, setFormSubstituteName] = useState<string>('');

  // 1. Fetch Classes List
  const { data: classesList } = useQuery({
    queryKey: ['classes-list-logs'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Teachers List
  const { data: teachersList } = useQuery({
    queryKey: ['teachers-list-logs'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // 3. Fetch Subjects List
  const { data: subjectsList } = useQuery({
    queryKey: ['subjects-list-logs', formClassId],
    queryFn: async () => {
      if (!formClassId) {
        const res = await api.get('/classes');
        // Extract unique subjects
        return [];
      }
      const res = await api.get(`/classes/${formClassId}`);
      return res.data?.data?.subjects?.map((cs: any) => cs.subject) || [];
    },
    enabled: !!formClassId,
  });

  // 4. Fetch Summary Stats
  const { data: summaryData } = useQuery({
    queryKey: ['teaching-logs-summary', filterDateBs],
    queryFn: async () => {
      const res = await api.get(`/daily-logs/summary?dateBs=${filterDateBs}`);
      return res.data?.data;
    },
  });

  // 5. Fetch Teaching Logs
  const { data: logsResponse, isLoading: isLogsLoading } = useQuery({
    queryKey: ['teaching-logs-list', filterDateBs, filterClassId, filterTeacherId, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDateBs) params.append('dateBs', filterDateBs);
      if (filterClassId) params.append('classId', filterClassId);
      if (filterTeacherId) params.append('teacherId', filterTeacherId);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      params.append('page', String(page));
      params.append('limit', '50');

      const res = await api.get(`/daily-logs?${params.toString()}`);
      return res.data?.data;
    },
  });

  const logsList = logsResponse?.logs || [];

  // Create Log Mutation
  const createLogMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/daily-logs', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-list'] });
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-summary'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success(data.message || 'Teaching log saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save teaching log.');
    },
  });

  // Update Log Mutation
  const updateLogMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/daily-logs/${payload.id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-list'] });
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-summary'] });
      setEditingLog(null);
      resetForm();
      toast.success(data.message || 'Teaching log updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update teaching log.');
    },
  });

  // Delete Log Mutation
  const deleteLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/daily-logs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-list'] });
      queryClient.invalidateQueries({ queryKey: ['teaching-logs-summary'] });
      toast.success('Teaching log deleted successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete log.');
    },
  });

  const resetForm = () => {
    setFormTeacherId('');
    setFormClassId('');
    setFormSubjectId('');
    setFormSubjectName('');
    setFormDateBs(todayBS());
    setFormPeriodNo(1);
    setFormTopicTaught('');
    setFormLearningOutcome('');
    setFormHomework('');
    setFormTeachingMethod('व्याख्या तथा छलफल (Lecture & Discussion)');
    setFormStudentFeedback('विद्यार्थीहरूको सक्रिय सहभागिता रह्यो (Active participation)');
    setFormStatus('COMPLETED');
    setFormSubstituteName('');
  };

  const openEditModal = (log: any) => {
    setEditingLog(log);
    setFormTeacherId(String(log.teacherId));
    setFormClassId(String(log.classId));
    setFormSubjectId(log.subjectId ? String(log.subjectId) : '');
    setFormSubjectName(log.subjectName || '');
    setFormDateBs(log.dateBs);
    setFormPeriodNo(log.periodNo || 1);
    setFormTopicTaught(log.topicTaught || '');
    setFormLearningOutcome(log.learningOutcome || '');
    setFormHomework(log.homework || '');
    setFormTeachingMethod(log.teachingMethod || '');
    setFormStudentFeedback(log.studentFeedback || '');
    setFormStatus(log.status || 'COMPLETED');
    setFormSubstituteName(log.substituteTeacherName || '');
  };

  // Print Daily Teaching Register
  const triggerPrintDailyRegister = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rows = logsList
      .map(
        (l: any, i: number) => `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1;">${i + 1}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${l.periodNo ? `P-${l.periodNo}` : '—'}</td>
        <td style="border: 1px solid #cbd5e1; font-weight: bold; color: #1e3a5f;">${l.teacher?.fullName || 'Teacher'}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${l.class?.name} (${l.class?.section || 'A'})</td>
        <td style="border: 1px solid #cbd5e1;"><strong>${l.subject?.name || l.subjectName || 'General'}</strong></td>
        <td style="border: 1px solid #cbd5e1;">${l.topicTaught}</td>
        <td style="border: 1px solid #cbd5e1; color: #b45309;">${l.homework || '—'}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; font-size: 9px; font-weight: bold;">${l.status}</td>
      </tr>
    `
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Teaching Register - ${filterDateBs} BS</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; border: 1px solid #bfdbfe; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 16px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 6px 5px; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 160px; text-align: center; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div style="font-size: 11px; font-weight: bold; color: #4b5563;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
            <div class="badge">दैनिक शिक्षण सहजीकरण लग / शिक्षक डायरी प्रतिवेदन (Daily Teaching Log Report)</div>
            <div style="margin-top: 6px; font-size: 11px; font-weight: bold;">
              मिति: ${filterDateBs} BS • जम्मा कक्षा रेकर्ड: ${logsList.length}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">क्र.स.</th>
                <th style="width: 35px; text-align: center;">घण्टी</th>
                <th style="width: 140px;">शिक्षकको नाम</th>
                <th style="width: 80px; text-align: center;">कक्षा (Class)</th>
                <th style="width: 110px;">विषय (Subject)</th>
                <th>पढाइएको पाठ / सिकाइ क्रियाकलाप (Lesson Topic Taught)</th>
                <th style="width: 150px;">गृहकार्य / कक्षाकार्य (Homework)</th>
                <th style="width: 65px; text-align: center;">स्थिति</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" style="text-align: center; padding: 20px;">No teaching logs found for this date.</td></tr>'}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-line">शैक्षिक संयोजक (Coordinator)</div>
            <div class="sig-line">सहायक प्रधानाध्यापक</div>
            <div class="sig-line">प्रधानाध्यापक (Headmaster / Stamp)</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-[#1e3a5f] px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                <BookOpen size={12} />
                <span>Academic Oversight & Daily Teacher Diary</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-blue-100 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                <Calendar size={12} />
                <span>BS {todayBSFormatted()}</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white font-serif">
              दैनिक शिक्षण लग तथा शिक्षक डायरी (Daily Teaching Logs)
            </h1>
            <p className="text-xs text-blue-200">
              Monitor what each teacher taught in every period today • Track topics, learning outcomes, homework, and student coverage
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={triggerPrintDailyRegister}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-black shadow-sm transition"
            >
              <Printer size={15} />
              <span>🖨️ Print Register (प्रतिवेदन प्रिन्ट)</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-4.5 py-2.5 text-xs font-black shadow-sm transition"
            >
              <Plus size={16} />
              <span>+ Add Teaching Log (नयाँ लग प्रविष्टि)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRICS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Periods Taught Today (आजका घण्टी)</span>
          <p className="text-2xl font-black font-mono text-[#1e3a5f] mt-1">
            {summaryData?.totalLogsToday ?? logsList.length}
          </p>
          <span className="text-[10px] text-gray-400 font-medium">Logged in system</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Active Teachers Today (शिक्षक संख्या)</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
            {summaryData?.activeTeachersTodayCount ?? '—'}
          </p>
          <span className="text-[10px] text-gray-400 font-medium">Conducted lessons</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Classes Covered (समेटिएका कक्षा)</span>
          <p className="text-2xl font-black font-mono text-purple-700 mt-1">
            {summaryData?.classesCoveredTodayCount ?? '—'} / {summaryData?.totalClassesCount ?? classesList?.length ?? 12}
          </p>
          <span className="text-[10px] text-gray-400 font-medium">Classes had lessons</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Selected Date (छानिएको मिति)</span>
          <p className="text-base font-black font-mono text-amber-700 mt-2">
            {filterDateBs} BS
          </p>
          <span className="text-[10px] text-gray-400 font-medium">Filtering view</span>
        </div>
      </div>

      {/* ─── 3. FILTERS & SEARCH BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-gray-700">मिति (Date BS):</label>
          <input
            type="text"
            placeholder="2083-05-15"
            value={filterDateBs}
            onChange={(e) => {
              setFilterDateBs(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 w-32"
          />
          <button
            type="button"
            onClick={() => {
              setFilterDateBs(todayBS());
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-[11px] font-extrabold"
          >
            Today (आज)
          </button>
        </div>

        {/* Class and Teacher Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={filterClassId}
            onChange={(e) => {
              setFilterClassId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50"
          >
            <option value="">All Classes (सबै कक्षा)</option>
            {classesList?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''}
              </option>
            ))}
          </select>

          {/* Teacher Filter */}
          <select
            value={filterTeacherId}
            onChange={(e) => {
              setFilterTeacherId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50"
          >
            <option value="">All Teachers (सबै शिक्षक)</option>
            {teachersList?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.fullName} {t.post ? `(${t.post})` : ''}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search topic, lesson, homework..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-slate-50 w-48 focus:w-60 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── 4. LOGS TABLE & CARDS ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e3a5f] text-white font-bold">
              <tr>
                <th className="px-3.5 py-3 text-center">Period</th>
                <th className="px-4 py-3">Teacher (शिक्षक)</th>
                <th className="px-3.5 py-3">Class & Sec</th>
                <th className="px-4 py-3">Subject (विषय)</th>
                <th className="px-4 py-3 max-w-xs">Topic Taught (पढाइएको पाठ)</th>
                <th className="px-4 py-3">Homework (गृहकार्य)</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLogsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                    <span>Loading teaching logs...</span>
                  </td>
                </tr>
              ) : logsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 space-y-1">
                    <BookOpen size={32} className="mx-auto text-gray-300 mb-1" />
                    <p className="font-bold text-gray-600">No teaching logs found for this date and filter.</p>
                    <p className="text-[11px] text-gray-400">Teachers can log daily lessons directly in their Teacher Portal.</p>
                  </td>
                </tr>
              ) : (
                logsList.map((log: any) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      {/* Period */}
                      <td className="px-3.5 py-3 text-center font-mono font-black text-[#1e3a5f]">
                        <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 block">
                          {log.periodNo ? `P-${log.periodNo}` : '—'}
                        </span>
                      </td>

                      {/* Teacher */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-[10px] text-[#1e3a5f] shrink-0">
                            {log.teacher?.photoUrl ? (
                              <img src={log.teacher.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                            ) : (
                              (log.teacher?.fullName || 'T').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <strong className="text-gray-900 block font-bold leading-tight">
                              {log.teacher?.fullName || 'Teacher'}
                            </strong>
                            <span className="text-[10px] text-gray-500 block">
                              {log.teacher?.post || 'Faculty'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="px-3.5 py-3 font-bold text-gray-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {log.class?.name} ({log.class?.section || 'A'})
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3">
                        <strong className="text-[#1e3a5f] block">
                          {log.subject?.name || log.subjectName || 'General'}
                        </strong>
                        {log.teachingMethod && (
                          <span className="text-[10px] text-gray-500 block truncate max-w-[150px]">
                            Method: {log.teachingMethod}
                          </span>
                        )}
                      </td>

                      {/* Topic Taught */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800 line-clamp-2 leading-relaxed">
                          {log.topicTaught}
                        </p>
                        {log.learningOutcome && (
                          <p className="text-[10px] text-emerald-700 font-medium mt-0.5 line-clamp-1">
                            🎯 {log.learningOutcome}
                          </p>
                        )}
                      </td>

                      {/* Homework */}
                      <td className="px-4 py-3 max-w-xs">
                        {log.homework ? (
                          <span className="text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200 block text-[11px] font-medium line-clamp-2">
                            📝 {log.homework}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            log.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'SUBSTITUTED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {log.status === 'COMPLETED' ? 'सम्पन्न' : log.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(log)}
                            className="p-1 rounded-lg hover:bg-blue-50 text-blue-700"
                            title="Edit Log"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this teaching log?')) {
                                deleteLogMutation.mutate(log.id);
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600"
                            title="Delete Log"
                          >
                            <Trash2 size={14} />
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

      {/* ─── 5. CREATE / EDIT TEACHING LOG MODAL ──────────────────────────────── */}
      {(isCreateModalOpen || editingLog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <BookOpen size={18} className="text-amber-500" />
                <span>{editingLog ? 'Edit Teaching Log (लग सम्पादन)' : 'Add Daily Teaching Log (नयाँ शिक्षण डायरी लग)'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingLog(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                  teacherId: formTeacherId,
                  classId: formClassId,
                  subjectId: formSubjectId || undefined,
                  subjectName: formSubjectName,
                  dateBs: formDateBs,
                  periodNo: formPeriodNo || 1,
                  topicTaught: formTopicTaught,
                  learningOutcome: formLearningOutcome,
                  homework: formHomework,
                  teachingMethod: formTeachingMethod,
                  studentFeedback: formStudentFeedback,
                  status: formStatus,
                  substituteTeacherName: formSubstituteName,
                };

                if (editingLog) {
                  updateLogMutation.mutate({ id: editingLog.id, ...payload });
                } else {
                  createLogMutation.mutate(payload);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Teacher and Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teacher (शिक्षक) *</label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="erp-input font-bold"
                    required
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachersList?.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Class (कक्षा) *</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="erp-input font-bold"
                    required
                  >
                    <option value="">-- Select Class --</option>
                    {classesList?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date (मिति BS) *</label>
                  <input
                    type="text"
                    required
                    value={formDateBs}
                    onChange={(e) => setFormDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Period No (घण्टी) *</label>
                  <select
                    value={formPeriodNo}
                    onChange={(e) => setFormPeriodNo(Number(e.target.value))}
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

              {/* Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subject (विषय)</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => {
                      setFormSubjectId(e.target.value);
                      const s = subjectsList?.find((sub: any) => String(sub.id) === e.target.value);
                      if (s) setFormSubjectName(s.name);
                    }}
                    className="erp-input font-bold"
                  >
                    <option value="">-- Select Subject (if mapped) --</option>
                    {subjectsList?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subject Name (विषय नाम):</label>
                  <input
                    type="text"
                    placeholder="e.g. कम्प्युटर / विज्ञान / गणित"
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Topic Taught */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Lesson Topic / Activity Taught (पाठ / शीर्षक / सिकाइ सहजीकरण विवरण) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Chapter 4: Photosynthesis process demonstration and plant cell discussion"
                  value={formTopicTaught}
                  onChange={(e) => setFormTopicTaught(e.target.value)}
                  className="erp-input"
                />
              </div>

              {/* Learning Outcome */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Learning Outcome (सिकाइ उपलब्धि / सक्षमता):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Students can define light and dark reactions with diagram"
                  value={formLearningOutcome}
                  onChange={(e) => setFormLearningOutcome(e.target.value)}
                  className="erp-input"
                />
              </div>

              {/* Homework */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Homework / Assignment (गृहकार्य / परियोजना कार्य):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Exercise 4.1 Q1-Q5 and draw leaf structure diagram"
                  value={formHomework}
                  onChange={(e) => setFormHomework(e.target.value)}
                  className="erp-input font-medium"
                />
              </div>

              {/* Teaching Method & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teaching Method / Materials</label>
                  <input
                    type="text"
                    value={formTeachingMethod}
                    onChange={(e) => setFormTeachingMethod(e.target.value)}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status (स्थिति)</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="COMPLETED">Completed (सम्पन्न)</option>
                    <option value="SUBSTITUTED">Substituted (सट्टा शिक्षक)</option>
                    <option value="CANCELLED">Cancelled (स्थगित)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingLog(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLogMutation.isPending || updateLogMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  <BookOpen size={14} />
                  <span>
                    {createLogMutation.isPending || updateLogMutation.isPending
                      ? 'Saving...'
                      : editingLog
                      ? 'Update Log (अद्यावधिक गर्नुहोस्)'
                      : 'Save Teaching Log (सुरक्षित गर्नुहोस्)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
