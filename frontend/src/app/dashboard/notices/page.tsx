'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Bell,
  Plus,
  Send,
  MessageSquare,
  Users,
  AlertTriangle,
  X,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NoticesPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Form state
  const [noticeType, setNoticeType] = useState('GENERAL');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStudentSearch, setTargetStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [sendSms, setSendSms] = useState(false);

  // Fetch Notices
  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['notices', filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      const res = await api.get(`/notices?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Students for individual notice
  const { data: studentsList } = useQuery({
    queryKey: ['students-notice-search', targetStudentSearch],
    queryFn: async () => {
      if (!targetStudentSearch || targetStudentSearch.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(targetStudentSearch)}&limit=6`);
      return res.data?.data || [];
    },
    enabled: targetStudentSearch.length >= 2,
  });

  // Create Notice Mutation
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
      toast.success('Notice published! SMS alert dispatched if configured.');
      setIsComposeModalOpen(false);
      setSelectedStudent(null);
      setTargetStudentSearch('');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to post notice');
    },
  });

  const handleComposeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    createNoticeMutation.mutate(data);
  };

  const notices = noticesData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Notice Board & SMS Alerts (सूचना तथा SMS प्रणाली)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            विद्यालयव्यापी, कक्षागत, शिक्षक तथा अनुपस्थित विद्यार्थीका अभिभावकलाई सिधै सन्देश (Sparrow SMS)
          </p>
        </div>

        <button
          onClick={() => setIsComposeModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Publish Notice / Send SMS</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'GENERAL', 'CLASS', 'INDIVIDUAL', 'ABSENT_ALERT', 'EXAM', 'EVENT'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === t
                ? 'bg-[#1e3a5f] text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-slate-50'
            }`}
          >
            {t === '' ? 'All Notices' : t}
          </button>
        ))}
      </div>

      {/* Notices Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading notices feed...</div>
        ) : notices.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Bell size={32} className="mx-auto text-gray-300 mb-1" />
            <p className="text-sm font-semibold text-gray-600">No notices published</p>
          </div>
        ) : (
          notices.map((n: any) => (
            <div
              key={n.id}
              className={`rounded-2xl border bg-white p-5 shadow-2xs transition space-y-2 ${
                n.type === 'ABSENT_ALERT' ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      n.type === 'ABSENT_ALERT'
                        ? 'bg-rose-100 text-rose-800'
                        : n.type === 'CLASS'
                        ? 'bg-blue-100 text-blue-800'
                        : n.type === 'EXAM'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {n.type}
                  </span>
                  {n.isAutomatic && (
                    <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold">
                      Auto Triggered
                    </span>
                  )}
                  {n.targetClass && (
                    <span className="text-xs font-semibold text-blue-700">
                      Target: {n.targetClass.name}
                    </span>
                  )}
                  {n.targetStudent && (
                    <span className="text-xs font-semibold text-gray-700">
                      Student: {n.targetStudent.fullName}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-gray-400 font-bold">{n.postedDateBs} BS</span>
              </div>

              <h3 className="text-base font-extrabold text-gray-900">{n.title}</h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* ─── COMPOSE NOTICE MODAL ──────────────────────────────────────────── */}
      {isComposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-sm font-bold text-[#1e3a5f]">Publish Announcement (सूचना प्रकाशन)</h2>
              <button onClick={() => setIsComposeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Audience (लक्षित समूह) *</label>
                <select
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value)}
                  className="erp-input font-semibold"
                >
                  <option value="GENERAL">Whole School (सबैका लागि)</option>
                  <option value="CLASS">Specific Class (कुनै एक कक्षा)</option>
                  <option value="INDIVIDUAL">Individual Student (एकजना विद्यार्थी)</option>
                  <option value="TEACHER">All Teachers (सबै शिक्षकहरू)</option>
                  <option value="EXAM">Examination Notice (परीक्षा सम्बन्धी)</option>
                  <option value="EVENT">Event / Program (कार्यक्रम)</option>
                </select>
              </div>

              {noticeType === 'CLASS' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Class *</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                    className="erp-input"
                  >
                    <option value="">Select Target Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
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
                        <p className="font-bold text-[#1e3a5f]">{selectedStudent.fullName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">Contact: {selectedStudent.guardianContact || 'No contact'}</p>
                      </div>
                      <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Type student name to search..."
                      value={targetStudentSearch}
                      onChange={(e) => setTargetStudentSearch(e.target.value)}
                      className="erp-input"
                    />
                  )}
                  {studentsList && studentsList.length > 0 && !selectedStudent && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg divide-y divide-gray-100">
                      {studentsList.map((st: any) => {
                        const clsName = st.classEnrollment?.[0]?.class?.name;
                        const secName = st.classEnrollment?.[0]?.class?.section;
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              setSelectedStudent(st);
                              setTargetStudentSearch('');
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-blue-50 text-xs transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900">{st.fullName}</span>
                              <span className="inline-block rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-black font-nepali border border-purple-200">
                                {clsName ? `${clsName}${secName ? ` (${secName})` : ''}` : 'Unassigned'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-gray-400 font-bold">{st.studentId}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Title (शीर्षक) *</label>
                <input required name="title" type="text" placeholder="Notice headline..." className="erp-input font-bold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content / Message *</label>
                <textarea
                  required
                  name="body"
                  rows={4}
                  placeholder="Detailed announcement or SMS message text..."
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded text-[#1e3a5f]"
                  />
                  <span>Send via Sparrow SMS to Guardian's Mobile</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNoticeMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280]"
                >
                  {createNoticeMutation.isPending ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
