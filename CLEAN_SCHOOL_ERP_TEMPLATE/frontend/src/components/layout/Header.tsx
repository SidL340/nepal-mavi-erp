'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { todayBSFormatted } from '@/lib/nepali-date';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Menu,
  Bell,
  Calendar,
  User,
  LogOut,
  ChevronDown,
  School,
  KeyRound,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'ड्यासबोर्ड' },
  '/dashboard/students': { title: 'Students Management', subtitle: 'विद्यार्थी व्यवस्थापन' },
  '/dashboard/classes': { title: 'Classes & Subjects', subtitle: 'कक्षा र विषय' },
  '/dashboard/attendance': { title: 'Attendance System', subtitle: 'हाजिरी व्यवस्थापन' },
  '/dashboard/exams': { title: 'Exams & Marksheets', subtitle: 'परीक्षा र लब्धाङ्क पत्र' },
  '/dashboard/certificates': { title: 'Certificates (CC/TC)', subtitle: 'चारित्रिक तथा स्थानान्तरण प्रमाणपत्र' },
  '/dashboard/finance/income': { title: 'Income & Budget', subtitle: 'आम्दानी र सरकारी बजेट' },
  '/dashboard/finance/expenses': { title: 'Expense Management', subtitle: 'खर्च व्यवस्थापन' },
  '/dashboard/finance/fees': { title: 'Fee Collection', subtitle: 'शुल्क संकलन' },
  '/dashboard/finance/payroll': { title: 'Teacher Payroll', subtitle: 'शिक्षक तलब तथा भत्ता' },
  '/dashboard/teachers': { title: 'Teachers & Staff', subtitle: 'शिक्षक तथा कर्मचारी' },
  '/dashboard/library': { title: 'Library Management', subtitle: 'पुस्तकालय व्यवस्थापन' },
  '/dashboard/inventory': { title: 'Inventory (Jinsi)', subtitle: 'जिन्सी व्यवस्थापन' },
  '/dashboard/notices': { title: 'Notices & SMS', subtitle: 'सूचना तथा सन्देश' },
  '/dashboard/school': { title: 'School Profile & Settings', subtitle: 'विद्यालय विवरण र सेटिङ' },
  '/teacher': { title: 'Teacher Portal', subtitle: 'शिक्षक पोर्टल' },
  '/student': { title: 'Student Portal', subtitle: 'विद्यार्थी पोर्टल' },
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoadingPass(true);
    try {
      await api.post('/users/change-my-password', { newPassword });
      toast.success('Your password has been changed successfully!');
      setIsChangePassModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoadingPass(false);
    }
  };

  const matchedPath = Object.keys(pageTitles).find(
    (k) => pathname === k || (k !== '/dashboard' && pathname.startsWith(k))
  );
  const currentTitle = matchedPath ? pageTitles[matchedPath] : { title: 'Nepal School ERP', subtitle: 'विद्यालय व्यवस्थापन' };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const displayName = user?.teacher?.fullName || user?.student?.fullName || user?.username || 'User';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 shadow-sm">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-lg font-bold text-[#1e3a5f] leading-tight">{currentTitle.title}</h1>
          <p className="text-xs text-gray-500 font-nepali hidden sm:block">{currentTitle.subtitle}</p>
        </div>
      </div>

      {/* Right: Date, Notifications, User Menu */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Nepali Date Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-[#1e3a5f]">
          <Calendar size={14} className="text-amber-500" />
          <span>BS {todayBSFormatted()}</span>
        </div>

        {/* Notices Quick Link */}
        <Link
          href="/dashboard/notices"
          className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-[#1e3a5f] transition-colors"
          title="Notices"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-xs font-bold shadow-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-gray-800 leading-none">{displayName}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{user?.role || 'User'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 z-50 border border-gray-100">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800">{displayName}</p>
                <p className="text-[11px] text-gray-500">{user?.role}</p>
              </div>

              {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                <Link
                  href="/dashboard/school"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <School size={14} className="text-gray-500" />
                  School Settings
                </Link>
              ) : null}

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setIsChangePassModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound size={14} className="text-amber-500" />
                <span>Change Password (पासवर्ड फेर्नुहोस्)</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
              >
                <LogOut size={14} />
                Logout (लगआउट)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CHANGE PASSWORD MODAL ───────────────────────────────────────────── */}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                <KeyRound className="text-amber-500" size={18} />
                <span>Change My Password (पासवर्ड फेर्नुहोस्)</span>
              </h3>
              <button onClick={() => setIsChangePassModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password (नयाँ पासवर्ड)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password (पासवर्ड पुनः टाईप गर्नुहोस्)</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsChangePassModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingPass}
                  className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {loadingPass ? 'Updating...' : 'Update Password Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
