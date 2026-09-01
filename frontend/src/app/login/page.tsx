'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, School, Lock, User, KeyRound, X, CheckCircle2, Phone, Sparkles, Send } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/teacher');
    router.prefetch('/student');
    router.prefetch('/dashboard/finance/fees');
  }, [router]);

  // Forgot password modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetFullName, setResetFullName] = useState('');
  const [resetRole, setResetRole] = useState('STUDENT');
  const [resetContact, setResetContact] = useState('');
  const [resetReason, setResetReason] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { token, user } = res.data;
      login(user, token);
      toast.success(`Welcome, ${user.teacher?.fullName || user.student?.fullName || user.username}!`);

      // Route based on role
      const roleRoutes: Record<string, string> = {
        SUPER_ADMIN: '/dashboard',
        ADMIN: '/dashboard',
        ACCOUNTANT: '/dashboard/finance/fees',
        TEACHER: '/teacher',
        LIBRARIAN: '/dashboard/library',
        STUDENT: '/student',
      };
      router.push(roleRoutes[user.role] || '/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset Request
  const handleResetRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      toast.error('Please enter your username, student ID, or phone number.');
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/auth/request-password-reset', {
        identifier: resetIdentifier,
        fullName: resetFullName,
        role: resetRole,
        contactInfo: resetContact,
        reason: resetReason,
      });

      setResetSubmitted(true);
      toast.success('Password reset request submitted to administration!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit reset request.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5986] to-[#1e3a5f] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-2xl mb-4 p-2 ring-4 ring-amber-400/50">
            <img src="/school_logo.png" alt="Shree Nepal Secondary School Emblem" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white font-serif tracking-wide">Nepal Secondary School ERP</h1>
          <p className="text-amber-300 mt-1 text-xs font-bold font-nepali">नेपाल माध्यमिक विद्यालय व्यवस्थापन प्रणाली</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-[#1e3a5f]">Sign In / लगइन गर्नुहोस्</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter your student ID or assigned staff username</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Username / Student EMIS ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('username')}
                  type="text"
                  placeholder="Username / Student EMIS ID"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-xs font-mono font-bold text-gray-900 bg-slate-50/50"
                  autoComplete="username"
                />
              </div>
              {errors.username && <p className="text-red-500 text-[11px] mt-1">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password / पासवर्ड
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-xs font-mono text-gray-900 bg-slate-50/50"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5986] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in (लगइन हुँदैछ)...</span>
                </>
              ) : (
                'Sign In / लगइन गर्नुहोस्'
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-blue-200 text-xs mt-6 space-y-1">
          <p>© {new Date().getFullYear()} Nepal Secondary School ERP • All rights reserved</p>
          <p className="text-amber-300/90 font-bold text-[11px]">
            Designed & Developed by <strong className="text-white font-black">Nirmala Tech Innovations Pvt. Ltd.</strong>
          </p>
        </div>
      </div>

      {/* ─── SELF SERVICE FORGOT PASSWORD MODAL ─────────────────────────────── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-500" />
                  <span>Request Password Reset (पासवर्ड रिसेट अनुरोध)</span>
                </h3>
                <p className="text-xs text-gray-500">Submit a request to school administration</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {resetSubmitted ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-base font-extrabold text-gray-900">Request Submitted Successfully!</h4>
                <p className="text-xs text-gray-600 leading-relaxed px-4">
                  तपाईंको पासवर्ड रिसेट अनुरोध विद्यालय प्रशासनमा पठाइएको छ। कक्षा शिक्षक वा प्रशासकले नयाँ पासवर्ड प्रदान गर्नुहुनेछ।
                </p>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="rounded-xl bg-[#1e3a5f] text-white px-6 py-2 text-xs font-bold shadow-xs mt-2"
                >
                  Back to Sign In (लगइन पेजमा फर्कनुहोस्)
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetRequestSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Your Username, Student EMIS ID, or Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3201600058003308, teacher.ram, or 98XXXXXXXX"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name (नाम)</label>
                    <input
                      type="text"
                      placeholder="e.g. Aachal Kumari"
                      value={resetFullName}
                      onChange={(e) => setResetFullName(e.target.value)}
                      className="erp-input"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Your Role</label>
                    <select
                      value={resetRole}
                      onChange={(e) => setResetRole(e.target.value)}
                      className="erp-input font-bold"
                    >
                      <option value="STUDENT">🎒 Student (विद्यार्थी)</option>
                      <option value="TEACHER">🎓 Teacher (शिक्षक)</option>
                      <option value="LIBRARIAN">📚 Librarian (पुस्तकालय)</option>
                      <option value="ACCOUNTANT">💰 Accountant (लेखापाल)</option>
                      <option value="ADMIN">🛡️ Admin (प्रशासक)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Contact Phone Number (सम्पर्क फोन नं.)
                  </label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={resetContact}
                    onChange={(e) => setResetContact(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Reason / Message (कैफियत)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Forgot my student portal password."
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="erp-input"
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
                    type="submit"
                    disabled={resetLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{resetLoading ? 'Submitting...' : 'Submit Request (अनुरोध पठाउनुहोस्)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
