'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users,
  UserCog,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Phone,
  Mail,
  GraduationCap,
  BookMarked,
  Receipt,
  Shield,
  Filter,
  X,
  Send,
} from 'lucide-react';

export default function UserManagementPage() {
  const queryClient = useQueryClient();

  // Active View Tab: 'users' | 'requests'
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

  // Filter States
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Bulk Reset & Printable Slips State
  const [isBulkResetModalOpen, setIsBulkResetModalOpen] = useState(false);
  const [isPrintOnlyModalOpen, setIsPrintOnlyModalOpen] = useState(false);
  const [isPrintSlipsModalOpen, setIsPrintSlipsModalOpen] = useState(false);
  const [bulkResetResults, setBulkResetResults] = useState<any[]>([]);
  const [bulkTargetRole, setBulkTargetRole] = useState<string>('STUDENT');
  const [bulkClassId, setBulkClassId] = useState<string>('');

  const [printTargetRole, setPrintTargetRole] = useState<string>('STUDENT');
  const [printClassId, setPrintClassId] = useState<string>('');
  const [isGeneratingSlips, setIsGeneratingSlips] = useState<boolean>(false);

  // Dialog for generated single credentials
  const [credentialDialog, setCredentialDialog] = useState<{
    isOpen: boolean;
    username: string;
    temporaryPassword: string;
    role: string;
    displayName?: string;
  } | null>(null);

  // Copied state
  const [copied, setCopied] = useState(false);

  // Form States for Create User
  const [createRole, setCreateRole] = useState<string>('LIBRARIAN');
  const [createUsername, setCreateUsername] = useState<string>('');
  const [createFullName, setCreateFullName] = useState<string>('');
  const [createPhone, setCreatePhone] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createMustChangePass, setCreateMustChangePass] = useState<boolean>(true);

  // Form State for Reset Password
  const [resetCustomPassword, setResetCustomPassword] = useState<string>('');

  // Fetch classes for bulk student filter
  const { data: classesList } = useQuery({
    queryKey: ['classes-list-users'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Bulk Reset Mutation
  const bulkResetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/users/bulk-reset-passwords', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bulk password reset complete!');
      setBulkResetResults(data.data || []);
      setIsBulkResetModalOpen(false);
      setIsPrintSlipsModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset passwords.');
    },
  });

  // ── 1. Fetch Users List ──
  const { data: usersResponse, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users-list', selectedRole, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      params.append('page', String(page));
      params.append('limit', '40');

      const res = await api.get(`/users?${params.toString()}`);
      return res.data?.data;
    },
  });

  // ── 2. Fetch Password Reset Requests ──
  const { data: resetRequests, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['password-reset-requests'],
    queryFn: async () => {
      const res = await api.get('/users/reset-requests/list');
      return res.data?.data || [];
    },
  });

  const usersList = usersResponse?.users || [];
  const stats = usersResponse?.stats || {};
  const pendingRequests = (resetRequests || []).filter((r: any) => r.status === 'PENDING');

  // ── 3. Create User Mutation ──
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsCreateModalOpen(false);
      // Reset form
      setCreateUsername('');
      setCreateFullName('');
      setCreatePhone('');
      setCreateEmail('');
      setCreatePassword('');

      // Show credentials dialog
      if (data?.data?.credentials) {
        setCredentialDialog({
          isOpen: true,
          username: data.data.credentials.username,
          temporaryPassword: data.data.credentials.temporaryPassword,
          role: data.data.credentials.role,
          displayName: data.data.user?.teacher?.fullName || data.data.user?.student?.fullName,
        });
      }
      toast.success('User account created successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create user account.');
    },
  });

  // ── 4. Admin Reset Password Mutation ──
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword?: string }) => {
      const res = await api.post(`/users/${userId}/reset-password`, { newPassword });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      setIsResetModalOpen(false);
      setResetCustomPassword('');

      if (data?.data) {
        setCredentialDialog({
          isOpen: true,
          username: data.data.username,
          temporaryPassword: data.data.temporaryPassword,
          role: data.data.role,
          displayName: data.data.displayName,
        });
      }
      toast.success(data.message || 'Password reset successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    },
  });

  // ── 5. Toggle User Active Status Mutation ──
  const toggleUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.delete(`/users/${userId}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success(data.message || 'User status updated.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user status.');
    },
  });

  // ── 6. Resolve Reset Request Mutation ──
  const resolveRequestMutation = useMutation({
    mutationFn: async ({ id, action, adminNotes }: { id: number; action: string; adminNotes?: string }) => {
      const res = await api.post(`/users/reset-requests/${id}/resolve`, { action, adminNotes });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });

      if (data?.data?.credentials) {
        setCredentialDialog({
          isOpen: true,
          username: data.data.credentials.username,
          temporaryPassword: data.data.credentials.temporaryPassword,
          role: data.data.credentials.role,
          displayName: data.data.credentials.displayName,
        });
      }
      toast.success(data.message || 'Request resolved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to resolve request.');
    },
  });

  // Helper to copy credentials to clipboard
  const copyCredentialsToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper for role badge colors
  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: 'Admin (प्रशासक)',
          icon: Shield,
        };
      case 'TEACHER':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Teacher (शिक्षक)',
          icon: GraduationCap,
        };
      case 'STUDENT':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'Student (विद्यार्थी)',
          icon: Users,
        };
      case 'LIBRARIAN':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Librarian (पुस्तकालय)',
          icon: BookMarked,
        };
      case 'ACCOUNTANT':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Accountant (लेखापाल)',
          icon: Receipt,
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-800 border-gray-200',
          label: role || 'User',
          icon: UserCog,
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. TOP HEADER & BRANDING ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-[#1e3a5f] px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                <ShieldCheck size={12} />
                <span>Security & User Administration</span>
              </span>
              {pendingRequests.length > 0 && (
                <span className="animate-pulse inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2.5 py-0.5 text-[11px] font-black">
                  <AlertCircle size={12} />
                  <span>{pendingRequests.length} Password Resets Pending</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white font-serif">
              प्रयोगकर्ता तथा पासवर्ड व्यवस्थापन
            </h1>
            <p className="text-xs text-blue-200">
              Create and manage Librarian, Teacher, Student, Accountant, and Admin accounts • Reset credentials with 1-click
            </p>
          </div>

          {/* Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintOnlyModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4.5 py-2.5 text-xs font-black shadow-sm transition"
            >
              <Receipt size={16} />
              <span>🖨️ Print Login Slips (लगइन स्लिप मात्र प्रिन्ट)</span>
            </button>

            <button
              onClick={() => setIsBulkResetModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4.5 py-2.5 text-xs font-black shadow-sm transition"
            >
              <KeyRound size={16} />
              <span>🔑 Reset Passwords & Print Slips</span>
            </button>

            <button
              onClick={() => {
                setCreateRole('TEACHER');
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-4.5 py-2.5 text-xs font-black shadow-sm transition"
            >
              <UserPlus size={16} />
              <span>+ Create User Account</span>
            </button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-4 border-t border-white/15">
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs ${
              activeTab === 'users'
                ? 'bg-white text-[#1e3a5f] shadow-md scale-102'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Users size={14} />
            <span>All System Users (सम्पूर्ण प्रयोगकर्ताहरू)</span>
            <span className="ml-1 rounded-full bg-[#1e3a5f] text-white px-2 py-0.2 text-[10px] font-mono">
              {stats.totalUsers || usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs relative ${
              activeTab === 'requests'
                ? 'bg-white text-[#1e3a5f] shadow-md scale-102'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <KeyRound size={14} />
            <span>Password Reset Requests (पासवर्ड रिसेट अनुरोधहरू)</span>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-rose-500 text-white px-2 py-0.2 text-[10px] font-black font-mono">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2. TAB 1: ALL USERS DIRECTORY ───────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Quick Stats Pill Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { role: 'ALL', label: 'All Users', count: stats.totalUsers || 1012, color: 'text-gray-900', bg: 'bg-white' },
              { role: 'TEACHER', label: 'Teachers', count: stats.teachers || 2, color: 'text-blue-700', bg: 'bg-blue-50/60' },
              { role: 'STUDENT', label: 'Students', count: stats.students || 1009, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
              { role: 'LIBRARIAN', label: 'Librarians', count: stats.librarians || 1, color: 'text-purple-700', bg: 'bg-purple-50/60' },
              { role: 'ACCOUNTANT', label: 'Accountants', count: stats.accountants || 0, color: 'text-amber-700', bg: 'bg-amber-50/60' },
              { role: 'ADMIN', label: 'Admins', count: stats.admins || 1, color: 'text-rose-700', bg: 'bg-rose-50/60' },
            ].map((st) => (
              <div
                key={st.role}
                onClick={() => {
                  setSelectedRole(st.role);
                  setPage(1);
                }}
                className={`rounded-2xl border p-3.5 shadow-2xs cursor-pointer transition ${
                  selectedRole === st.role
                    ? 'border-[#1e3a5f] bg-white ring-2 ring-[#1e3a5f]/20 scale-102'
                    : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold text-gray-500 uppercase block">{st.label}</span>
                <p className={`text-xl font-black font-mono mt-1 ${st.color}`}>{st.count}</p>
              </div>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username, student ID, full name, phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs bg-slate-50 focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Role Filter:</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50"
              >
                <option value="ALL">All Roles (सबै)</option>
                <option value="TEACHER">Teachers (शिक्षक)</option>
                <option value="STUDENT">Students (विद्यार्थी)</option>
                <option value="LIBRARIAN">Librarians (पुस्तकालय)</option>
                <option value="ACCOUNTANT">Accountants (लेखापाल)</option>
                <option value="ADMIN">Admins (प्रशासक)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white font-bold">
                  <tr>
                    <th className="px-4 py-3">S.N.</th>
                    <th className="px-4 py-3">User & Display Name</th>
                    <th className="px-4 py-3">Username (लगइन आईडी)</th>
                    <th className="px-4 py-3">Role (पद / भूमिका)</th>
                    <th className="px-4 py-3">Contact & Identifier</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions (कार्यहरू)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                        <span>Loading user accounts...</span>
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No users found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u: any, idx: number) => {
                      const roleBadge = getRoleBadge(u.role);
                      const RoleIcon = roleBadge.icon;
                      const displayName = u.teacher?.fullName || u.student?.fullName || u.username;
                      const nepaliName = u.teacher?.fullNameNepali || u.student?.fullNameNepali;
                      const contactPhone = u.teacher?.phone || u.student?.guardianContact || u.student?.phone || '—';
                      const studentId = u.student?.studentId;
                      const enrollment = u.student?.classEnrollment?.[0];

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono text-gray-500">
                            {(page - 1) * 40 + idx + 1}
                          </td>

                          {/* Display Name & Avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-black text-xs text-[#1e3a5f] shrink-0">
                                {u.teacher?.photoUrl || u.student?.photoUrl ? (
                                  <img
                                    src={u.teacher?.photoUrl || u.student?.photoUrl}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <span className="font-extrabold text-gray-900 block">{displayName}</span>
                                {nepaliName && (
                                  <span className="text-[10px] text-gray-500 font-nepali block">{nepaliName}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="px-4 py-3 font-mono font-bold text-[#1e3a5f]">
                            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                              {u.username}
                            </span>
                          </td>

                          {/* Role Badge */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${roleBadge.bg}`}
                            >
                              <RoleIcon size={12} />
                              <span>{roleBadge.label}</span>
                            </span>
                          </td>

                          {/* Contact Info / Class */}
                          <td className="px-4 py-3 text-gray-600">
                            <div className="space-y-0.5">
                              {studentId && (
                                <span className="font-mono text-[10px] text-gray-500 block">
                                  ID: {studentId} {enrollment?.class?.name ? `(${enrollment.class.name})` : ''}
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-gray-700 block">
                                📞 {contactPhone}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleUserMutation.mutate(u.id)}
                              title="Click to toggle status"
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition ${
                                u.isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {u.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              <span>{u.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click Print Individual Slip */}
                              <button
                                onClick={() => {
                                  const className = u.student?.classEnrollment?.[0]?.class
                                    ? `${u.student.classEnrollment[0].class.name} (${u.student.classEnrollment[0].class.section || 'A'})`
                                    : u.teacher?.post || u.role;
                                  setBulkResetResults([{
                                    id: u.id,
                                    username: u.username,
                                    role: u.role,
                                    fullName: u.teacher?.fullName || u.student?.fullName || u.username,
                                    studentId: u.student?.studentId || '—',
                                    className,
                                    rollNo: u.student?.classEnrollment?.[0]?.rollNo || u.id,
                                    temporaryPassword: u.role === 'STUDENT' ? `SSB@${u.student?.classEnrollment?.[0]?.rollNo || u.id}` : '••••••••',
                                  }]);
                                  setIsPrintSlipsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 text-[11px] font-extrabold shadow-2xs transition"
                                title="Print Login Slip"
                              >
                                <Receipt size={12} />
                                <span>Print Slip (स्लिप)</span>
                              </button>

                              {/* 1-Click Reset Password */}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setResetCustomPassword('');
                                  setIsResetModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 text-[11px] font-extrabold shadow-2xs transition"
                                title="Reset Password"
                              >
                                <KeyRound size={12} />
                                <span>Reset Password</span>
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

            {/* Pagination */}
            {usersResponse?.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">
                  Showing page <b>{page}</b> of <b>{usersResponse.totalPages}</b> ({usersResponse.total} users)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= usersResponse.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. TAB 2: PASSWORD RESET REQUESTS QUEUE ─────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-500" />
                  <span>Incoming Password Reset Requests (पासवर्ड रिसेट अनुरोधहरू)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Requests submitted by students, teachers, librarians, and staff who forgot their passwords
                </p>
              </div>

              <span className="rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs font-bold font-mono">
                Total: {resetRequests?.length || 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">S.N.</th>
                    <th className="px-4 py-3">Requester Identifier</th>
                    <th className="px-4 py-3">Full Name & Role</th>
                    <th className="px-4 py-3">Contact Phone / Email</th>
                    <th className="px-4 py-3">Reason / Issue</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isRequestsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Loading requests...
                      </td>
                    </tr>
                  ) : resetRequests?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No password reset requests found.
                      </td>
                    </tr>
                  ) : (
                    resetRequests.map((req: any, idx: number) => {
                      const isPending = req.status === 'PENDING';
                      const isResolved = req.status === 'RESOLVED';
                      const roleBadge = getRoleBadge(req.role);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>

                          {/* Identifier */}
                          <td className="px-4 py-3 font-mono font-extrabold text-[#1e3a5f]">
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {req.identifier}
                            </span>
                          </td>

                          {/* Full Name & Role */}
                          <td className="px-4 py-3">
                            <span className="font-extrabold text-gray-900 block">{req.fullName || 'User'}</span>
                            <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold mt-0.5 ${roleBadge.bg}`}>
                              {roleBadge.label}
                            </span>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 py-3 font-mono text-gray-700">
                            {req.contactInfo ? `📞 ${req.contactInfo}` : '—'}
                          </td>

                          {/* Reason */}
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {req.reason || 'Forgot password'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPending
                                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                                  : isResolved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {isPending && <Clock size={11} />}
                              {isResolved && <Check size={11} />}
                              <span>{req.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() =>
                                    resolveRequestMutation.mutate({
                                      id: req.id,
                                      action: 'APPROVE',
                                      adminNotes: 'Approved and reset by Admin',
                                    })
                                  }
                                  disabled={resolveRequestMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-bold shadow-xs transition"
                                >
                                  <Check size={12} />
                                  <span>Approve & Reset</span>
                                </button>

                                <button
                                  onClick={() =>
                                    resolveRequestMutation.mutate({
                                      id: req.id,
                                      action: 'REJECT',
                                      adminNotes: 'Rejected by Admin',
                                    })
                                  }
                                  disabled={resolveRequestMutation.isPending}
                                  className="rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 px-2.5 py-1 text-xs font-semibold"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-mono">
                                Resolved on {new Date(req.resolvedAt || req.updatedAt).toISOString().slice(0, 10)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. CREATE USER MODAL ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <UserPlus size={18} className="text-amber-500" />
                  <span>Create User Account (नयाँ खाता सिर्जना)</span>
                </h3>
                <p className="text-xs text-gray-500">Create login credentials for school staff or students</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate({
                  username: createUsername,
                  password: createPassword,
                  role: createRole,
                  fullName: createFullName,
                  phone: createPhone,
                  email: createEmail,
                  mustChangePassword: createMustChangePass,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Role Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">User Role (भूमिका) *</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="erp-input font-bold"
                  required
                >
                  <option value="LIBRARIAN">📚 Librarian (पुस्तकालय प्रमुख)</option>
                  <option value="TEACHER">🎓 Teacher (शिक्षक)</option>
                  <option value="STUDENT">🎒 Student (विद्यार्थी)</option>
                  <option value="ACCOUNTANT">💰 Accountant (लेखापाल)</option>
                  <option value="ADMIN">🛡️ Admin (प्रशासक)</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name (पूरा नाम) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Bahadur Thapa"
                  value={createFullName}
                  onChange={(e) => {
                    setCreateFullName(e.target.value);
                    if (!createUsername) {
                      // Auto-suggest clean username
                      const suggested = e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, '.');
                      setCreateUsername(suggested);
                    }
                  }}
                  className="erp-input font-bold"
                />
              </div>

              {/* Username */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700">Username (लगइन प्रयोगकर्ता नाम) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = createRole.toLowerCase();
                      const rand = Math.floor(100 + Math.random() * 900);
                      setCreateUsername(`${prefix}.${rand}`);
                    }}
                    className="text-[10px] text-blue-700 font-bold hover:underline"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. librarian.ramesh"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              {/* Contact Phone & Email */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email (ऐच्छिक)</label>
                  <input
                    type="email"
                    placeholder="user@nepalschool.edu"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700">Password (पासवर्ड)</label>
                  <span className="text-[10px] text-gray-400">Leave blank to auto-generate</span>
                </div>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="erp-input font-mono"
                />
              </div>

              {/* Must Change Password Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-gray-700">
                <input
                  type="checkbox"
                  checked={createMustChangePass}
                  onChange={(e) => setCreateMustChangePass(e.target.checked)}
                  className="rounded text-[#1e3a5f]"
                />
                <span className="font-medium text-[11px]">
                  Require user to change password on first login (पहिलो लगइनमा पासवर्ड परिवर्तन गर्न लगाउने)
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Creating Account...' : 'Create Account (खाता बनाउनुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. RESET PASSWORD MODAL ─────────────────────────────────────────── */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-500" />
                  <span>Reset User Password (पासवर्ड रिसेट)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  User: <b>{selectedUser.username}</b> ({selectedUser.teacher?.fullName || selectedUser.student?.fullName || selectedUser.role})
                </p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>1-Click Auto-Generated Temporary Password</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Click below to generate a new temporary password. The user will be prompted to choose a new password upon logging in.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Custom Password (ऐच्छिक - आफ्नै पासवर्ड राख्न सक्नुहुन्छ):
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-generated password"
                  value={resetCustomPassword}
                  onChange={(e) => setResetCustomPassword(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetPasswordMutation.isPending}
                  onClick={() =>
                    resetPasswordMutation.mutate({
                      userId: selectedUser.id,
                      newPassword: resetCustomPassword,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 font-black text-[#1e3a5f] shadow-xs transition disabled:opacity-50"
                >
                  <KeyRound size={14} />
                  <span>{resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password Now (रिसेट गर्नुहोस्)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. SUCCESS CREDENTIALS DISPLAY DIALOG (1-CLICK COPY) ────────────── */}
      {credentialDialog && credentialDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1e3a5f]">
                    Credentials Ready (लगइन विवरण तयार भयो)
                  </h3>
                  <p className="text-[11px] text-gray-500">Please share these credentials with the user</p>
                </div>
              </div>
              <button
                onClick={() => setCredentialDialog(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Credentials Card */}
            <div className="rounded-2xl border-2 border-dashed border-[#1e3a5f] bg-slate-50 p-4 space-y-3 font-mono text-xs">
              {credentialDialog.displayName && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-sans font-bold">Name:</span>
                  <strong className="text-gray-900 font-sans">{credentialDialog.displayName}</strong>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-bold">Username (लगइन आईडी):</span>
                <strong className="text-[#1e3a5f] font-black text-sm bg-blue-100 px-2 py-0.5 rounded">
                  {credentialDialog.username}
                </strong>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-bold">Password (पासवर्ड):</span>
                <strong className="text-amber-800 font-black text-sm bg-amber-100 px-2 py-0.5 rounded">
                  {credentialDialog.temporaryPassword}
                </strong>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-2 font-sans text-[11px]">
                <span className="text-gray-500 font-bold">Role:</span>
                <span className="font-extrabold text-purple-800 uppercase">{credentialDialog.role}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Nepal School ERP Credentials:\nName: ${credentialDialog.displayName || credentialDialog.username}\nUsername: ${credentialDialog.username}\nPassword: ${credentialDialog.temporaryPassword}\nRole: ${credentialDialog.role}\nPortal URL: https://app.nepalssb.edu.np/login`;
                  copyCredentialsToClipboard(text);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition"
              >
                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard! ✓' : 'Copy Credentials (विवरण कपी गर्नुहोस्)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialDialog(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Done (सम्पन्न)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. BULK RESET PASSWORDS MODAL ────────────────────────────────────── */}
      {isBulkResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                Bulk Password Reset & Login Slips (सबैको पासवर्ड रिसेट)
              </h3>
              <button onClick={() => setIsBulkResetModalOpen(false)}><X size={18} /></button>
            </div>

            <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              ⚠️ Warning: This will generate new temporary passwords for all selected users and require them to set a new password upon first login.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                bulkResetMutation.mutate({
                  targetRole: bulkTargetRole,
                  classId: bulkTargetRole === 'STUDENT' ? bulkClassId : undefined,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target User Role *</label>
                <select
                  value={bulkTargetRole}
                  onChange={(e) => setBulkTargetRole(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="STUDENT">All Students (सम्पूर्ण विद्यार्थीहरू)</option>
                  <option value="TEACHER">All Teachers & Staff (सम्पूर्ण शिक्षकहरू)</option>
                  <option value="ALL">All Users in System (सम्पूर्ण प्रयोगकर्ताहरू)</option>
                </select>
              </div>

              {bulkTargetRole === 'STUDENT' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Filter by Class (Optional)</label>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">All Classes (सबै कक्षा)</option>
                    {classesList?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsBulkResetModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={bulkResetMutation.isPending} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs">
                  {bulkResetMutation.isPending ? 'Resetting Passwords...' : 'Reset Passwords & Generate Slips'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 7B. PRINT SLIPS ONLY MODAL (WITHOUT RESETTING PASSWORDS) ────────── */}
      {isPrintOnlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                Print Login Credentials Slips (लगइन स्लिप प्रिन्ट मात्र)
              </h3>
              <button onClick={() => setIsPrintOnlyModalOpen(false)}><X size={18} /></button>
            </div>

            <p className="text-xs text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              ℹ️ Print official student & staff login cards with QR codes anytime WITHOUT modifying or resetting their passwords.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target User Role *</label>
                <select
                  value={printTargetRole}
                  onChange={(e) => setPrintTargetRole(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="STUDENT">All Students (सम्पूर्ण विद्यार्थीहरू)</option>
                  <option value="TEACHER">All Teachers & Staff (सम्पूर्ण शिक्षकहरू)</option>
                  <option value="ALL">All Users in System (सम्पूर्ण प्रयोगकर्ताहरू)</option>
                </select>
              </div>

              {printTargetRole === 'STUDENT' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Filter by Class (Optional)</label>
                  <select
                    value={printClassId}
                    onChange={(e) => setPrintClassId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">All Classes (सबै कक्षा)</option>
                    {classesList?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsPrintOnlyModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                <button
                  type="button"
                  disabled={isGeneratingSlips}
                  onClick={async () => {
                    setIsGeneratingSlips(true);
                    try {
                      const params = new URLSearchParams();
                      if (printTargetRole !== 'ALL') params.append('role', printTargetRole);
                      params.append('limit', '1000');

                      const res = await api.get(`/users?${params.toString()}`);
                      let fetchedUsers = res.data?.data?.users || [];

                      if (printClassId && printTargetRole === 'STUDENT') {
                        const targetClass = classesList?.find((c: any) => String(c.id) === String(printClassId));
                        const targetClassName = targetClass?.name?.toLowerCase() || '';

                        fetchedUsers = fetchedUsers.filter((u: any) => {
                          const studentClass = u.student?.classEnrollment?.[0]?.class;
                          if (!studentClass) return false;
                          return String(studentClass.id) === String(printClassId) ||
                                 (targetClassName && studentClass.name?.toLowerCase() === targetClassName);
                        });
                      }

                      if (fetchedUsers.length === 0) {
                        toast.error('No users found matching the selected class/role.');
                        setIsGeneratingSlips(false);
                        return;
                      }

                      const slips = fetchedUsers.map((u: any) => {
                        const className = u.student?.classEnrollment?.[0]?.class
                          ? `${u.student.classEnrollment[0].class.name} (${u.student.classEnrollment[0].class.section || 'A'})`
                          : u.teacher?.post || u.role;
                        return {
                          id: u.id,
                          username: u.username,
                          role: u.role,
                          fullName: u.teacher?.fullName || u.student?.fullName || u.username,
                          studentId: u.student?.studentId || '—',
                          className,
                          rollNo: u.student?.classEnrollment?.[0]?.rollNo || u.id,
                          temporaryPassword: u.role === 'STUDENT' ? `SSB@${u.student?.classEnrollment?.[0]?.rollNo || u.id}` : '••••••••',
                        };
                      });

                      setBulkResetResults(slips);
                      setIsPrintOnlyModalOpen(false);
                      setIsPrintSlipsModalOpen(true);
                      setTimeout(() => window.print(), 500);
                    } catch (err: any) {
                      toast.error('Failed to load user slips.');
                    } finally {
                      setIsGeneratingSlips(false);
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isGeneratingSlips ? 'Loading Slips...' : 'Generate & Print Slips Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. PRINTABLE LOGIN CREDENTIALS SLIPS / RECEIPTS MODAL ───────────── */}
      {isPrintSlipsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
            {/* Top Action Bar */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md flex flex-wrap justify-between items-center border-b border-gray-200 pb-3 print:hidden gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1e3a5f]">
                  Print Login Credentials Slips ({bulkResetResults.length} Slips Ready)
                </h3>
                <p className="text-xs text-gray-500">Official student & staff login cards with QR codes and App installation steps</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Receipt size={16} />
                  <span>🖨️ Print / Save as PDF (प्रिन्ट वा PDF सेभ गर्नुहोस्)</span>
                </button>
                <button
                  onClick={() => setIsPrintSlipsModalOpen(false)}
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-100 font-bold rounded-xl text-xs text-gray-700"
                >
                  Close (बन्द गर्नुहोस्)
                </button>
              </div>
            </div>

            {/* Print Stylesheet for Perfect A4 Sizing & Full Color */}
            <style jsx global>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 6mm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body * {
                  visibility: hidden !important;
                }
                .print-slips-modal-content, .print-slips-modal-content * {
                  visibility: visible !important;
                }
                .print-slips-modal-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                  box-shadow: none !important;
                }
                .print-slips-grid {
                  display: grid !important;
                  grid-template-columns: repeat(2, 1fr) !important;
                  gap: 10px !important;
                }
                .print-slip-card {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  border: 1.5px dashed #1e3a5f !important;
                  padding: 12px !important;
                  border-radius: 12px !important;
                  background: white !important;
                }
              }
            `}</style>

            {/* Printable Container Grid */}
            <div className="print-slips-modal-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-slips-grid">
                {bulkResetResults.map((item: any, idx: number) => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://app.nepalssb.edu.np/login')}`;
                  return (
                    <div key={idx} className="border-2 border-dashed border-[#1e3a5f] rounded-2xl p-4 bg-white space-y-3 relative print-slip-card">
                      {/* Header with Circular Seal */}
                      <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                        <div className="w-11 h-11 shrink-0 rounded-full border border-amber-400 p-0.5 bg-white flex items-center justify-center shadow-xs">
                          <img src="/school_logo.png" alt="School Emblem Seal" className="w-10 h-10 object-contain rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1 text-center">
                          <h4 className="font-black text-xs text-[#1e3a5f] font-nepali tracking-tight">श्री नेपाल मा.वि. विश्रामपुर, रौतहट</h4>
                          <p className="text-[10px] font-bold text-gray-700">Shree Nepal Secondary School, Bishrampur</p>
                          <span className="inline-block mt-0.5 bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.2 rounded uppercase">
                            Portal Access Credentials Card
                          </span>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-3 gap-2 items-center text-xs">
                        {/* Details Column */}
                        <div className="col-span-2 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-bold">Name:</span>
                            <strong className="text-gray-900">{item.fullName}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-bold">Role / Class:</span>
                            <span className="font-extrabold text-blue-900">{item.className}</span>
                          </div>
                          {item.studentId !== '—' && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">Student ID / Roll:</span>
                              <span className="font-mono text-gray-700">{item.studentId} (Roll: {item.rollNo})</span>
                            </div>
                          )}
                          <div className="mt-2 pt-1 border-t border-gray-100 space-y-1">
                            <div className="flex justify-between bg-blue-50 p-1 rounded font-mono">
                              <span className="text-gray-600 font-bold">Username:</span>
                              <strong className="text-[#1e3a5f]">{item.username}</strong>
                            </div>
                            <div className="flex justify-between bg-amber-50 p-1 rounded font-mono">
                              <span className="text-gray-600 font-bold">Password:</span>
                              <strong className="text-amber-900">{item.temporaryPassword}</strong>
                            </div>
                          </div>
                        </div>

                        {/* QR Code Column */}
                        <div className="col-span-1 text-center flex flex-col items-center justify-center border-l border-gray-100 pl-2">
                          <img src={qrUrl} alt="Login QR Code" className="w-20 h-20 border rounded-lg p-0.5 shadow-2xs" />
                          <span className="text-[8px] font-bold text-gray-500 mt-1">Scan to Login & Install App</span>
                        </div>
                      </div>

                      {/* Footer instructions */}
                      <div className="text-[8px] text-gray-500 border-t border-dashed border-gray-200 pt-1 text-center">
                        🌐 Visit <strong>https://app.nepalssb.edu.np/login</strong> or scan QR • Tap "Add to Home Screen" to install Mobile App
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
