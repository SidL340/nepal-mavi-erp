'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  UserCheck,
  Check,
  X,
  Calendar,
  Clock,
  Filter,
  Search,
  Plus,
  AlertCircle,
  GraduationCap,
  Users,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');

  // Fetch all leaves from backend
  const { data: leavesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-leaves', activeTab, statusFilter],
    queryFn: async () => {
      const params: any = { applicantType: activeTab };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/leaves', { params });
      return res.data?.data || [];
    },
  });

  const leaves = (leavesData || []).filter((l: any) => {
    if (!search) return true;
    const name = l.teacher?.fullName || l.student?.fullName || '';
    const reason = l.reason || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      reason.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Review mutation (Approve / Reject)
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
      const res = await api.post(`/leaves/${id}/review`, { status, remarks });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'निर्णय सुरक्षित गरियो!');
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'कारबाही गर्न सकिएन।');
    },
  });

  const pendingTeacherCount = (leavesData || []).filter((l: any) => l.applicantType === 'TEACHER' && l.status === 'PENDING').length;
  const pendingStudentCount = (leavesData || []).filter((l: any) => l.applicantType === 'STUDENT' && l.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300">
              <UserCheck size={14} />
              <span>प्रशासन बिदा स्वीकृति केन्द्र</span>
            </span>
          </div>
          <h1 className="text-2xl font-black">Leave Approvals & Management (बिदा व्यवस्थापन)</h1>
          <p className="text-xs text-blue-100/90 mt-1 font-nepali">
            शिक्षक, कर्मचारी तथा विद्यार्थीहरूको बिदा आवेदन स्वीकृति, समीक्षा तथा अभिलेख व्यवस्थापन
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-xs text-xs">
          <div className="text-center px-2">
            <span className="text-[10px] text-blue-200 block font-bold">शिक्षक विचाराधीन</span>
            <strong className="text-base font-extrabold text-amber-300">{pendingTeacherCount}</strong>
          </div>
          <div className="h-7 w-px bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-blue-200 block font-bold">विद्यार्थी विचाराधीन</span>
            <strong className="text-base font-extrabold text-white">{pendingStudentCount}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        {/* Applicant Type Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('TEACHER');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'TEACHER'
                ? 'bg-[#1e3a5f] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <GraduationCap size={16} />
            <span>Staff & Teachers (शिक्षक तथा कर्मचारी)</span>
            {pendingTeacherCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1e3a5f] text-[10px] font-black">
                {pendingTeacherCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('STUDENT');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'STUDENT'
                ? 'bg-[#1e3a5f] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users size={16} />
            <span>Students (विद्यार्थी बिदा)</span>
            {pendingStudentCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1e3a5f] text-[10px] font-black">
                {pendingStudentCount}
              </span>
            )}
          </button>
        </div>

        {/* Status Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 text-xs font-bold">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#1e3a5f] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st === 'ALL' ? 'सबै (All)' : st === 'PENDING' ? 'विचाराधीन' : st === 'APPROVED' ? 'स्वीकृत' : 'अस्वीकृत'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="नाम वा कारण खोज्नुहोस्..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Leave Requests Table / Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs">बिदा आवेदनहरू लोड हुँदैछन्...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <UserCheck size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">कुनै बिदा आवेदन फेला परेन</p>
            <p className="text-xs text-gray-400">छानिएको वर्गमा कुनै रेकर्ड छैन।</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leaves.map((l: any) => {
              const name = l.teacher?.fullName || l.student?.fullName || 'आवेदक';
              const roleText =
                l.applicantType === 'TEACHER'
                  ? `शिक्षक (${l.teacher?.type || 'दरबन्दी'}) • फोन: ${l.teacher?.phone || '—'}`
                  : `विद्यार्थी • ${l.class?.name || 'कक्षा'} ${l.class?.section ? `(${l.class?.section})` : ''} • Roll #${l.student?.classEnrollment?.[0]?.rollNo || '1'}`;

              return (
                <div
                  key={l.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-extrabold text-sm text-gray-900">{name}</h3>
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {roleText}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.status === 'APPROVED'
                          ? '✓ स्वीकृत (Approved)'
                          : l.status === 'REJECTED'
                          ? '✕ अस्वीकृत (Rejected)'
                          : '⏳ विचाराधीन (Pending)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="font-bold text-indigo-900 flex items-center gap-1">
                        <Calendar size={13} />
                        <span>बिदा अवधि: {l.startDateBs} देखि {l.endDateBs} सम्म</span>
                      </span>
                      <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        कुल {l.totalDays} दिन
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        दर्ता: {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-gray-800 font-sans leading-relaxed">
                      <b className="text-gray-500">निवेदन / कारण:</b> {l.reason}
                    </div>

                    {l.reviewedByName && (
                      <p className="text-[11px] text-gray-500">
                        निर्णय: <b>{l.reviewedByName}</b> ({l.reviewedByRole})
                        {l.reviewRemarks && ` • कैफियत: "${l.reviewRemarks}"`} • {new Date(l.reviewedAt).toLocaleString('ne-NP')}
                      </p>
                    )}
                  </div>

                  {/* Actions for Admin / Accountant */}
                  <div className="flex items-center gap-2 shrink-0">
                    {l.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => {
                            reviewMutation.mutate({ id: l.id, status: 'APPROVED' });
                          }}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <Check size={15} />
                          <span>स्वीकृत गर्नुहोस् (Approve)</span>
                        </button>
                        <button
                          onClick={() => {
                            const remarks = prompt('अस्वीकृत गर्नुको कारण / कैफियत (वैकल्पिक):');
                            reviewMutation.mutate({ id: l.id, status: 'REJECTED', remarks: remarks || undefined });
                          }}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <X size={15} />
                          <span>अस्वीकृत (Reject)</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const newStatus = l.status === 'APPROVED' ? 'REJECTED' : 'APPROVED';
                          if (confirm(`के तपाईं यो निर्णय परिवर्तन गरी ${newStatus === 'APPROVED' ? 'स्वीकृत' : 'अस्वीकृत'} बनाउन चाहनुहुन्छ?`)) {
                            reviewMutation.mutate({ id: l.id, status: newStatus });
                          }
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-blue-700 underline cursor-pointer"
                      >
                        निर्णय संशोधन गर्नुहोस् (Change)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
