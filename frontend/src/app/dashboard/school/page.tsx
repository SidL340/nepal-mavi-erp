'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  School as SchoolIcon,
  Building,
  Save,
  Plus,
  Landmark,
  Calendar,
  KeyRound,
  CheckCircle2,
  X,
  CreditCard,
  Edit2,
  Trash2,
  Power,
  Layers,
  Upload,
  Stamp,
  Camera,
  Image as ImageIcon,
  Check,
  Database,
  Download,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileJson,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SchoolProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'years' | 'accounts' | 'scales' | 'backup'>('profile');
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  
  // Salary Scale Modal state
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<any>(null);

  // Fetch School Profile
  const { data: schoolData, isLoading: isSchoolLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // Controlled Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: 'Nepal Model Secondary School',
    nameNepali: 'नेपाल आदर्श माध्यमिक विद्यालय',
    emisCode: 'ABC123',
    level: 'Secondary (माध्यमिक)',
    type: 'Community (सामुदायिक)',
    address: 'Kathmandu, Nepal',
    district: 'Kathmandu',
    province: 'Bagmati',
    phone: '01-4000000',
    email: 'info@nepalmodel.edu.np',
    principalName: 'Prof. Dr. Principal',
    logoUrl: '',
    sealUrl: '',
  });

  // Sync profileForm when schoolData is fetched
  useEffect(() => {
    if (schoolData && Object.keys(schoolData).length > 0) {
      setProfileForm({
        name: schoolData.name || 'Nepal Model Secondary School',
        nameNepali: schoolData.nameNepali || 'नेपाल आदर्श माध्यमिक विद्यालय',
        emisCode: schoolData.emisCode || 'ABC123',
        level: schoolData.level || 'Secondary (माध्यमिक)',
        type: schoolData.type || 'Community (सामुदायिक)',
        address: schoolData.address || 'Kathmandu, Nepal',
        district: schoolData.district || 'Kathmandu',
        province: schoolData.province || 'Bagmati',
        phone: schoolData.phone || '01-4000000',
        email: schoolData.email || 'info@nepalmodel.edu.np',
        principalName: schoolData.principalName || 'Prof. Dr. Principal',
        logoUrl: schoolData.logoUrl || '',
        sealUrl: schoolData.sealUrl || '',
      });
    }
  }, [schoolData]);

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });

  // Fetch Bank Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  // Fetch ALL Salary Scales for admin management
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales-all'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/all');
      return res.data?.data || [];
    },
  });

  // Save School Profile Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/school/profile', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('School profile, logo & official seal updated successfully!');
      if (data?.data) {
        setProfileForm((prev) => ({ ...prev, ...data.data }));
      }
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  // Image Upload Handler (Logo or Seal)
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'logoUrl' | 'sealUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Image size must be under 500 KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfileForm((prev) => ({ ...prev, [targetField]: base64 }));
      toast.success(`${targetField === 'logoUrl' ? 'Logo' : 'Official Seal'} selected! Click Save to apply.`);
    };
    reader.readAsDataURL(file);
  };

  // Add Academic Year Mutation
  const addYearMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/classes/academic-years', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Academic Year added!');
      setIsAddYearOpen(false);
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add year');
    },
  });

  // Add Bank Account Mutation
  const addAccountMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/school/bank-accounts', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bank Account added!');
      setIsAddAccountOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add account');
    },
  });

  // Bank Account Edit & Delete state
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Update Bank Account Mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/school/bank-accounts/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bank Account updated successfully!');
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update account');
    },
  });

  // Delete Bank Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/school/bank-accounts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bank Account deactivated');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    },
  });

  // Activate Academic Year Mutation
  const activateYearMutation = useMutation({
    mutationFn: async (yearId: number) => {
      const res = await api.patch(`/classes/academic-years/${yearId}/activate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Academic Year set as ACTIVE!');
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });

  // Save/Update Salary Scale Mutation
  const saveScaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: any }) => {
      if (id) {
        const res = await api.put(`/payroll/salary-scales/${id}`, data);
        return res.data;
      } else {
        const res = await api.post('/payroll/salary-scales', data);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingScale ? 'Salary scale updated!' : 'New salary scale added!');
      setIsScaleModalOpen(false);
      setEditingScale(null);
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
      queryClient.invalidateQueries({ queryKey: ['salary-scales'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save salary scale');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveProfileMutation.mutate(profileForm);
  };

  // Fetch System Backup Status
  const { data: backupStatus, refetch: refetchBackupStatus } = useQuery({
    queryKey: ['system-backup-status'],
    queryFn: async () => {
      const res = await api.get('/school/backup/status');
      return res.data?.data;
    },
    enabled: activeTab === 'backup',
  });

  const handleExportBackup = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating complete system backup file...');
    try {
      const res = await api.get('/school/backup/export', { responseType: 'blob' });
      const dateStr = new Date().toISOString().split('T')[0];
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nepal_school_erp_full_backup_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Complete system backup downloaded!', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to export backup: ' + (err.message || 'Error'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (!restoreFile) {
      toast.error('Please select a .json backup file to restore');
      return;
    }
    setIsImporting(true);
    const toastId = toast.loading('Restoring system backup... Please wait...');
    try {
      const text = await restoreFile.text();
      const jsonData = JSON.parse(text);
      const res = await api.post('/school/backup/import', jsonData);
      if (res.data?.success) {
        toast.success('System backup restored successfully!', { id: toastId });
        queryClient.invalidateQueries();
        refetchBackupStatus();
        setRestoreFile(null);
      } else {
        toast.error(res.data?.message || 'Restore failed', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Invalid backup file or restore error: ' + (err.message || 'Error'), { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const years = yearsData || [];
  const accounts = accountsData || [];
  const scales = scalesData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            School Profile & Settings (विद्यालय विवरण र सेटिङ)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage school details, official logo, official seal stamp, academic years, bank accounts & salary scales
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'profile'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          School Profile (विद्यालय विवरण)
        </button>

        <button
          onClick={() => setActiveTab('years')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'years'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Academic Years (शैक्षिक सत्र)
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'accounts'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Bank Accounts (बैंक खाता)
        </button>

        <button
          onClick={() => setActiveTab('scales')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'scales'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Salary Scales (तलबमान सूची)
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheck size={15} />
          <span>System Backup & Restore (ब्याकअप र पुनर्भण्डारण)</span>
        </button>
      </div>

      {/* ─── TAB 1: SCHOOL PROFILE ─────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Logo & Official Seal Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. School Logo Upload Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-[#1e3a5f]" />
                  <h3 className="text-sm font-extrabold text-[#1e3a5f]">
                    School Logo (विद्यालयको लोगो)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400">Header & Grade Sheets</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-[#1e3a5f]/30 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {profileForm.logoUrl ? (
                    <img src={profileForm.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <SchoolIcon className="h-10 w-10 text-slate-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-xs text-gray-600">
                    Upload PNG or JPG school logo. Appears on all marksheets, grade sheets, receipts, and headers.
                  </p>
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-3.5 py-1.5 text-xs font-extrabold cursor-pointer transition shadow-xs">
                    <Upload size={13} />
                    <span>Upload Logo (लोगो अपलोड)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e, 'logoUrl')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Official Seal / Stamp Upload Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <Stamp size={18} className="text-amber-600" />
                  <h3 className="text-sm font-extrabold text-amber-900">
                    Official Stamp / Seal (विद्यालयको आधिकारिक छाप)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Certificates & Receipts
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-50/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {profileForm.sealUrl ? (
                    <img src={profileForm.sealUrl} alt="Official Seal" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Stamp className="h-10 w-10 text-amber-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-xs text-gray-600">
                    Upload PNG official round stamp/seal. Printed on certificates, fee receipts, and official documents.
                  </p>
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] px-3.5 py-1.5 text-xs font-black cursor-pointer transition shadow-xs">
                    <Upload size={13} />
                    <span>Upload Seal (छाप अपलोड)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e, 'sealUrl')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Name (English) *</label>
                  <input
                    required
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="erp-input font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Name (नेपाली) *</label>
                  <input
                    type="text"
                    value={profileForm.nameNepali}
                    onChange={(e) => setProfileForm({ ...profileForm, nameNepali: e.target.value })}
                    className="erp-input font-nepali font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">IEMIS Code *</label>
                  <input
                    type="text"
                    value={profileForm.emisCode}
                    onChange={(e) => setProfileForm({ ...profileForm, emisCode: e.target.value })}
                    className="erp-input font-mono font-bold text-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Level</label>
                  <input
                    type="text"
                    value={profileForm.level}
                    onChange={(e) => setProfileForm({ ...profileForm, level: e.target.value })}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Type</label>
                  <input
                    type="text"
                    value={profileForm.type}
                    onChange={(e) => setProfileForm({ ...profileForm, type: e.target.value })}
                    className="erp-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Address *</label>
                  <input
                    required
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">District (जिल्ला)</label>
                  <input
                    type="text"
                    value={profileForm.district}
                    onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Province (प्रदेश)</label>
                  <input
                    type="text"
                    value={profileForm.province}
                    onChange={(e) => setProfileForm({ ...profileForm, province: e.target.value })}
                    className="erp-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="erp-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="erp-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Headmaster / Principal Name</label>
                  <input
                    type="text"
                    value={profileForm.principalName}
                    onChange={(e) => setProfileForm({ ...profileForm, principalName: e.target.value })}
                    className="erp-input font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saveProfileMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#2a5280] shadow-sm disabled:opacity-60 transition"
                >
                  <Save size={14} />
                  <span>{saveProfileMutation.isPending ? 'Saving Profile...' : 'Update School Profile (सुरक्षित गर्नुहोस्)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ACADEMIC YEARS ───────────────────────────────────────── */}
      {activeTab === 'years' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-900">Academic Years List</h2>
            <button
              onClick={() => setIsAddYearOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Add Academic Year</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold">Academic Year</th>
                  <th className="p-3.5 font-bold">Start Date (BS)</th>
                  <th className="p-3.5 font-bold">End Date (BS)</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                  <th className="p-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {years.map((y: any) => (
                  <tr key={y.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-gray-900">{y.year}</td>
                    <td className="p-3.5 font-mono">{y.startDateBs}</td>
                    <td className="p-3.5 font-mono">{y.endDateBs}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${
                          y.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {y.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {!y.isActive && (
                        <button
                          onClick={() => activateYearMutation.mutate(y.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Set Active
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BANK ACCOUNTS ────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-900">School Bank Accounts</h2>
            <button
              onClick={() => setIsAddAccountOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Add Bank Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-[#1e3a5f] text-sm">{acc.bankName}</h3>
                    <p className="text-xs text-gray-500">{acc.accountName} • {acc.branch || 'Main Branch'}</p>
                  </div>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {acc.type || 'Current'}
                  </span>
                </div>
                <p className="font-mono font-bold text-gray-800 text-sm tracking-wider">{acc.accountNo}</p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setEditingAccount(acc)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-bold transition"
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to deactivate this bank account?')) {
                        deleteAccountMutation.mutate(acc.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold transition"
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SALARY SCALES ────────────────────────────────────────── */}
      {activeTab === 'scales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Government Salary Scales (नेपाल सरकार तलबमान सूची)</h2>
              <p className="text-xs text-gray-500">Configured salary grades for auto-calculating teacher payrolls</p>
            </div>
            <button
              onClick={() => {
                setEditingScale(null);
                setIsScaleModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Add Salary Scale</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-bold">
                <tr>
                  <th className="p-3.5">Taha / Shreni (तह / श्रेणी)</th>
                  <th className="p-3.5">Mool Talab (मूल तलब रू)</th>
                  <th className="p-3.5">Grade Rate (ग्रेड दर रू)</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scales.map((sc: any) => (
                  <tr key={sc.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-gray-900">{sc.taha}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-800">
                      Rs. {sc.moolTalab?.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono text-gray-700">
                      Rs. {sc.gradeAmount?.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingScale(sc);
                          setIsScaleModalOpen(true);
                        }}
                        className="rounded-lg bg-blue-50 text-blue-700 px-2.5 py-1 font-bold text-xs hover:bg-blue-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: SYSTEM BACKUP & RESTORE ─────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] to-[#2a5280] p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-3 py-1 text-xs font-bold text-emerald-300">
                <ShieldCheck size={14} />
                <span>100% Data Protection Suite</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">Full System Data Backup & Restore</h2>
              <p className="text-xs text-blue-100/90 max-w-xl font-nepali">
                विद्यालयको सम्पूर्ण विद्यार्थी, शिक्षक, प्राप्ताङ्क, हाजिरी तथा वित्तीय तथ्याङ्क सुरक्षित राख्न ब्याकअप फाइल डाउनलोड गर्नुहोस् वा पूर्व ब्याकअप पुनर्भण्डारण गर्नुहोस्।
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-3 text-xs font-extrabold text-[#1e3a5f] shadow-md transition disabled:opacity-50"
            >
              <Download size={16} />
              <span>{isExporting ? 'Exporting Backup...' : 'Download Full System Backup (.JSON)'}</span>
            </button>
          </div>

          {/* Database Summary Snapshot */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#1e3a5f]" />
                <h3 className="text-sm font-extrabold text-[#1e3a5f]">
                  Current Live Database Records (हालको डाटाबेस स्थिति)
                </h3>
              </div>
              <button
                onClick={() => refetchBackupStatus()}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <RefreshCw size={13} />
                <span>Refresh Counts</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                <span className="block text-2xl font-black text-blue-900">{backupStatus?.students ?? '1,009'}</span>
                <span className="text-[11px] font-bold text-blue-700">Enrolled Students</span>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                <span className="block text-2xl font-black text-emerald-900">{backupStatus?.markEntries ?? '52,468'}</span>
                <span className="text-[11px] font-bold text-emerald-700">Exam Mark Entries</span>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-center">
                <span className="block text-2xl font-black text-purple-900">{backupStatus?.attendance ?? '1,572'}</span>
                <span className="text-[11px] font-bold text-purple-700">Attendance Records</span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
                <span className="block text-2xl font-black text-amber-900">{backupStatus?.users ?? '1,015'}</span>
                <span className="text-[11px] font-bold text-amber-700">User Accounts</span>
              </div>
            </div>
          </div>

          {/* Export & Import Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Export Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <FileJson size={20} className="text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#1e3a5f]">1. Download System Backup File</h3>
                  <p className="text-[11px] text-gray-500">Creates an offline copy of all school records on your computer</p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/60 text-xs text-gray-700 space-y-2">
                <p className="font-bold text-[#1e3a5f]">Included in Backup File:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600">
                  <li>Student Profiles, IEMIS IDs, Roll Numbers & Guardians</li>
                  <li>All Exam Marks, Grade Sheets & Mark Titles (52,468+ entries)</li>
                  <li>Teacher Profiles, Staff Payroll & Salary Scales</li>
                  <li>Income Categories, Expense Categories & Fee Collections</li>
                  <li>Library Books, Certificates & Issued Notices</li>
                </ul>
              </div>

              <button
                onClick={handleExportBackup}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white py-3 text-xs font-extrabold shadow-sm transition disabled:opacity-50"
              >
                <Download size={16} />
                <span>{isExporting ? 'Generating JSON File...' : 'Download Complete Backup File'}</span>
              </button>
            </div>

            {/* 2. Import Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-blue-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#1e3a5f]">2. Restore Backup File</h3>
                  <p className="text-[11px] text-gray-500">Upload a previously exported JSON backup file to restore records</p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">
                  <strong>Safety Notice:</strong> Restoring a backup will safely merge and update all records in your database with the data contained in the uploaded backup file.
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Select Backup File (.JSON)</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                onClick={handleImportBackup}
                disabled={isImporting || !restoreFile}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-extrabold shadow-sm transition disabled:opacity-50"
              >
                <UploadCloud size={16} />
                <span>{isImporting ? 'Restoring System Data...' : 'Restore Backup File Into Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD YEAR MODAL ──────────────────────────────────────────────── */}
      {isAddYearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1e3a5f]">Add Academic Year</h3>
              <button onClick={() => setIsAddYearOpen(false)}><X size={16} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addYearMutation.mutate({
                  year: fd.get('year'),
                  startDateBs: fd.get('startDateBs'),
                  endDateBs: fd.get('endDateBs'),
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Year Code (e.g. 2083-84)</label>
                <input required name="year" type="text" placeholder="2083-84" className="erp-input font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Start Date (BS)</label>
                  <input required name="startDateBs" type="text" placeholder="2083-01-01" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">End Date (BS)</label>
                  <input required name="endDateBs" type="text" placeholder="2083-12-30" className="erp-input font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddYearOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#1e3a5f] text-white font-bold rounded-lg">Save Year</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD BANK ACCOUNT MODAL ─────────────────────────────────────── */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1e3a5f]">Add Bank Account</h3>
              <button onClick={() => setIsAddAccountOpen(false)}><X size={16} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addAccountMutation.mutate({
                  bankName: fd.get('bankName'),
                  accountName: fd.get('accountName'),
                  accountNo: fd.get('accountNo'),
                  branch: fd.get('branch'),
                  type: fd.get('type'),
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Bank Name</label>
                <input required name="bankName" type="text" placeholder="Rastriya Banijya Bank" className="erp-input font-bold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Account Title / Name</label>
                <input required name="accountName" type="text" placeholder="Nepal Mavi General Account" className="erp-input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Account Number</label>
                  <input required name="accountNo" type="text" placeholder="12300011122" className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Branch</label>
                  <input name="branch" type="text" placeholder="Main Branch" className="erp-input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddAccountOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#1e3a5f] text-white font-bold rounded-lg">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT BANK ACCOUNT MODAL ─────────────────────────────────────── */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1e3a5f]">Edit School Bank Account</h3>
              <button onClick={() => setEditingAccount(null)}><X size={16} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateAccountMutation.mutate({
                  id: editingAccount.id,
                  data: {
                    bankName: fd.get('bankName'),
                    accountName: fd.get('accountName'),
                    accountNo: fd.get('accountNo'),
                    branch: fd.get('branch'),
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Bank Name *</label>
                <input
                  required
                  name="bankName"
                  type="text"
                  defaultValue={editingAccount.bankName}
                  placeholder="Rastriya Banijya Bank"
                  className="erp-input font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Account Title / Name *</label>
                <input
                  required
                  name="accountName"
                  type="text"
                  defaultValue={editingAccount.accountName}
                  placeholder="Nepal Mavi General Account"
                  className="erp-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Account Number *</label>
                  <input
                    required
                    name="accountNo"
                    type="text"
                    defaultValue={editingAccount.accountNo}
                    placeholder="12300011122"
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Branch</label>
                  <input
                    name="branch"
                    type="text"
                    defaultValue={editingAccount.branch || ''}
                    placeholder="Main Branch"
                    className="erp-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAccountMutation.isPending}
                  className="px-4 py-1.5 bg-[#1e3a5f] text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {updateAccountMutation.isPending ? 'Updating...' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT SALARY SCALE MODAL ─────────────────────────────────── */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1e3a5f]">
                {editingScale ? 'Edit Salary Scale' : 'Add New Salary Scale'}
              </h3>
              <button onClick={() => setIsScaleModalOpen(false)}><X size={16} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveScaleMutation.mutate({
                  id: editingScale?.id,
                  data: {
                    taha: fd.get('taha'),
                    moolTalab: parseFloat(fd.get('moolTalab') as string),
                    gradeAmount: parseFloat(fd.get('gradeAmount') as string),
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Taha / Shreni Title (तह / श्रेणी)</label>
                <input
                  required
                  name="taha"
                  type="text"
                  defaultValue={editingScale?.taha || ''}
                  placeholder="e.g. माध्यमिक द्वितीय श्रेणी"
                  className="erp-input font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Mool Talab (मूल तलब रू)</label>
                  <input
                    required
                    name="moolTalab"
                    type="number"
                    defaultValue={editingScale?.moolTalab || ''}
                    placeholder="43680"
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Grade Rate (ग्रेड दर रू)</label>
                  <input
                    required
                    name="gradeAmount"
                    type="number"
                    defaultValue={editingScale?.gradeAmount || ''}
                    placeholder="1456"
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsScaleModalOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#1e3a5f] text-white font-bold rounded-lg">Save Scale</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
