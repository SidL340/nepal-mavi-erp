'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  Search,
  Plus,
  RefreshCw,
  Clock,
  User,
  ArrowLeft,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Globe,
  Trash,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export default function SchoolEmailPage() {
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<'INBOX' | 'SENT' | 'STARRED' | 'TRASH'>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Authentication State
  const [authEmail, setAuthEmail] = useState('nepalsecondaryschool.bdn@gmail.com');
  const [authPassword, setAuthPassword] = useState('#Include9845');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [is2FAError, setIs2FAError] = useState(false);

  // Check auth status
  const { data: authData, isLoading: isAuthLoading } = useQuery({
    queryKey: ['email-auth-status'],
    queryFn: async () => {
      const res = await api.get('/email/auth-status');
      return res.data;
    },
  });

  const isAuthenticated = authData?.isAuthenticated || false;

  // Connect & Authenticate mutation
  const authMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await api.post('/email/auth-connect', { email, password });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'इमेल सफलतापूर्वक प्रमाणीकरण भयो!');
      setAuthError(null);
      setIs2FAError(false);
      queryClient.invalidateQueries({ queryKey: ['email-auth-status'] });
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'प्रमाणीकरण असफल भयो।';
      setAuthError(msg);
      setIs2FAError(!!err?.response?.data?.is2FA);
      toast.error(msg);
    },
  });

  // Lock Mailbox mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/lock');
      return res.data;
    },
    onSuccess: () => {
      toast.success('इमेल सत्र बन्द गरियो (Mailbox Locked).');
      queryClient.invalidateQueries({ queryKey: ['email-auth-status'] });
    },
  });

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    toAddress: '',
    toName: '',
    ccAddress: '',
    subject: '',
    body: '',
  });
  const [composeMsg, setComposeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch emails
  const { data: emailData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['school-emails', selectedFolder, searchQuery],
    queryFn: async () => {
      const res = await api.get('/email', {
        params: {
          folder: selectedFolder,
          search: searchQuery || undefined,
        },
      });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const emails = emailData?.data || [];
  const unreadCount = emailData?.unreadCount || 0;

  // Star mutation
  const starMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/email/${id}/star`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
      if (selectedEmail) {
        setSelectedEmail((prev: any) => ({ ...prev, isStarred: !prev.isStarred }));
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, permanent }: { id: number; permanent?: boolean }) => {
      await api.delete(`/email/${id}${permanent ? '?permanent=true' : ''}`);
    },
    onSuccess: () => {
      toast.success('इमेल हटाइयो।');
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
      setSelectedEmail(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'इमेल हटाउन सकिएन।');
    },
  });

  // Empty Trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/email/empty-trash');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'रद्दीटोकरी खाली गरियो!');
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'रद्दीटोकरी खाली गर्न सकिएन।');
    },
  });

  // Sync with Gmail via IMAP
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/email/sync');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'जिमेल सिंक भयो!');
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'जिमेल सिंक हुन सकेन।';
      toast.error(msg, { duration: 6000 });
    },
  });

  // Send Email mutation
  const sendMutation = useMutation({
    mutationFn: async (formData: typeof composeForm) => {
      const res = await api.post('/email/send', formData);
      return res.data;
    },
    onSuccess: (data) => {
      setComposeMsg({ type: 'success', text: data?.message || 'इमेल सफलतापूर्वक पठाइयो!' });
      setTimeout(() => {
        setIsComposeOpen(false);
        setComposeMsg(null);
        setComposeForm({ toAddress: '', toName: '', ccAddress: '', subject: '', body: '' });
        queryClient.invalidateQueries({ queryKey: ['school-emails'] });
      }, 1200);
    },
    onError: (err: any) => {
      setComposeMsg({
        type: 'error',
        text: err?.response?.data?.message || 'इमेल पठाउन सकिएन। कृपया विवरण जाँच्नुहोस्।',
      });
    },
  });

  const handleOpenEmail = async (email: any) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      try {
        await api.get(`/email/${email.id}`);
        queryClient.invalidateQueries({ queryKey: ['school-emails'] });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setComposeMsg(null);
    if (!composeForm.toAddress || !composeForm.subject || !composeForm.body) {
      setComposeMsg({ type: 'error', text: 'प्राप्तकर्ताको इमेल, विषय र सन्देश अनिवार्य छ।' });
      return;
    }
    sendMutation.mutate(composeForm);
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs text-gray-500 font-medium">इमेल सुरक्षा प्रमाणीकरण जाँच्दै...</p>
      </div>
    );
  }

  // ── MAILBOX AUTHENTICATION GATE ──
  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-700 shadow-xs border border-blue-100">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            School Mailbox Authentication (इमेल सुरक्षा प्रमाणीकरण)
          </h1>
          <p className="text-xs text-gray-600 font-nepali">
            विद्यालयको आधिकारिक इमेल (<span className="font-bold text-gray-800">nepalsecondaryschool.bdn@gmail.com</span>) पहुँच गर्न कृपया प्रमाणीकरण गर्नुहोस्।
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-5">
          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{authError}</p>
                {is2FAError && (
                  <p className="text-[11px] text-rose-700 leading-relaxed font-nepali">
                    💡 <strong>सुझाव:</strong> गुगलको सुरक्षा नीतिका कारण मुख्य पासवर्ड बाह्य एपमा सिधै प्रयोग गर्न मिल्दैन। 
                    गुगल सेक्युरिटीमा गएर १६-अक्षरको <strong>App Password</strong> जेनेरेट गरी यहाँ पासवर्डको ठाउँमा हाल्नुहोस्।
                  </p>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              authMutation.mutate({ email: authEmail, password: authPassword });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-blue-600" />
                <span>विद्यालय आधिकारिक इमेल (Email Address)</span>
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="nepalsecondaryschool.bdn@gmail.com"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Key size={14} className="text-amber-600" />
                  <span>इमेल पासवर्ड / Google App Password</span>
                </label>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:text-blue-800 underline font-bold inline-flex items-center gap-1"
                >
                  <HelpCircle size={12} />
                  <span>App Password कसरी लिने?</span>
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password वा Google App Password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authMutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authMutation.isPending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>प्रमाणीकरण गरिँदैछ (Authenticating)...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>प्रमाणीकरण गरी इमेल खोल्नुहोस् (Authenticate & Enter)</span>
                </>
              )}
            </button>
          </form>

          {/* Alternative Direct Webmail Link */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-nepali">
              <Sparkles size={14} className="text-amber-500" />
              <span>वा सिधै गुगल खाताबाट खोल्नुहोस्:</span>
            </span>
            <a
              href="https://mail.google.com/mail/u/?authuser=nepalsecondaryschool.bdn@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold transition"
            >
              <Globe size={14} />
              <span>Open in Gmail.com</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED WEBMAIL WORKSPACE ──
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  School Official Webmail (विद्यालय इमेल केन्द्र)
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                  <ShieldCheck size={12} />
                  <span>प्रमाणीकृत (Authenticated)</span>
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {authEmail || 'nepalsecondaryschool.bdn@gmail.com'} — आधिकारिक पत्राचार, सूचना तथा पत्राचार व्यवस्थापन
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sync with Gmail button */}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Fetch recent incoming emails from Gmail"
          >
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>{syncMutation.isPending ? 'सिंक हुँदैछ...' : 'जिमेल सिंक (Sync)'}</span>
          </button>

          {/* Direct Live Gmail Sign-In / Launcher */}
          <a
            href="https://mail.google.com/mail/u/?authuser=nepalsecondaryschool.bdn@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Globe size={14} />
            <span>Open in Gmail</span>
            <ExternalLink size={12} />
          </a>

          {/* Lock / Log out */}
          <button
            onClick={() => {
              if (confirm('के तपाईं इमेल सत्र बन्द (Lock) गर्न चाहनुहुन्छ?')) {
                lockMutation.mutate();
              }
            }}
            disabled={lockMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-xs font-bold text-gray-700 transition cursor-pointer"
            title="Lock Mailbox"
          >
            <Lock size={14} />
            <span>लक गर्नुहोस् (Lock)</span>
          </button>

          {/* Compose Button */}
          <button
            onClick={() => {
              setIsComposeOpen(true);
              setComposeMsg(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus size={16} />
            <span>नयाँ इमेल लेख्नुहोस् (Compose)</span>
          </button>
        </div>
      </div>

      {/* Main Mail Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[580px] bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className="md:col-span-3 border-r border-gray-100 bg-slate-50/50 p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedFolder('INBOX');
                setSelectedEmail(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFolder === 'INBOX'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox size={16} />
                <span>Inbox (प्राप्त इमेल)</span>
              </div>
              {unreadCount > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    selectedFolder === 'INBOX'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedFolder('SENT');
                setSelectedEmail(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFolder === 'SENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send size={16} />
                <span>Sent (पठाइएका)</span>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFolder('STARRED');
                setSelectedEmail(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFolder === 'STARRED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star size={16} />
                <span>Starred (महत्त्वपूर्ण)</span>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFolder('TRASH');
                setSelectedEmail(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFolder === 'TRASH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 size={16} />
                <span>Trash (रद्दीटोकरी)</span>
              </div>
            </button>
          </div>

          {/* School Contact Card */}
          <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-3 text-[11px] text-blue-900 mt-6">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Sparkles size={14} className="text-blue-600" />
              <span>Official Mailbox</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              विद्यालयको आधिकारिक इमेल CEHRD, शिक्षा विकास तथा समन्वय इकाई, र नगरपालिका शिक्षा शाखासँग जोडिएको छ।
            </p>
          </div>
        </div>

        {/* Right Main Panel: List or Detailed View */}
        <div className="md:col-span-9 flex flex-col">
          {/* Top Search Filter & Actions */}
          <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="विषय, प्रेषक वा सन्देश खोज्नुहोस् (Search emails)..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedFolder === 'TRASH' && emails.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('के तपाईं रद्दीटोकरी (Trash) का सबै इमेल स्थायी रूपमा मेटाउन चाहनुहुन्छ? यो फिर्ता आउने छैन।')) {
                    emptyTrashMutation.mutate();
                  }
                }}
                disabled={emptyTrashMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{emptyTrashMutation.isPending ? 'मेटाउँदै...' : 'Empty Trash (रद्दीटोकरी खाली गर्नुहोस्)'}</span>
              </button>
            )}
          </div>

          {/* Content Area */}
          {selectedEmail ? (
            /* Detailed Email View */
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>फिर्ता सूचीमा (Back to List)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => starMutation.mutate(selectedEmail.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition cursor-pointer"
                      title="Star"
                    >
                      <Star
                        size={18}
                        className={selectedEmail.isStarred ? 'fill-amber-400 text-amber-500' : ''}
                      />
                    </button>
                    <button
                      onClick={() => {
                        const isTrash = selectedEmail.folder === 'TRASH';
                        const promptMsg = isTrash
                          ? 'के तपाईं यो इमेल स्थायी रूपमा मेटाउन चाहनुहुन्छ (Permanently Delete)?'
                          : 'के तपाईं यो इमेल रद्दीटोकरी (Trash) मा सार्न चाहनुहुन्छ?';
                        if (confirm(promptMsg)) {
                          deleteMutation.mutate({ id: selectedEmail.id, permanent: isTrash });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                      title={selectedEmail.folder === 'TRASH' ? 'Permanently Delete' : 'Move to Trash'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Email Subject & Header */}
                <h2 className="text-lg font-extrabold text-gray-900 mb-4">{selectedEmail.subject}</h2>

                <div className="flex items-start justify-between bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-gray-900">
                        {selectedEmail.fromName || selectedEmail.fromAddress}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        From: &lt;{selectedEmail.fromAddress}&gt;
                      </div>
                      <div className="text-[11px] text-gray-500">
                        To: &lt;{selectedEmail.toAddress}&gt;
                        {selectedEmail.ccAddress && ` | CC: ${selectedEmail.ccAddress}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{new Date(selectedEmail.receivedOrSentAt).toLocaleString('ne-NP')}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-line leading-relaxed font-sans text-xs sm:text-sm bg-white p-2">
                  {selectedEmail.body}
                </div>
              </div>

              {/* Bottom Quick Reply */}
              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => {
                    setComposeForm({
                      toAddress: selectedEmail.fromAddress,
                      toName: selectedEmail.fromName || '',
                      ccAddress: '',
                      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
                      body: `\n\n--- Original Message ---\n${selectedEmail.body}`,
                    });
                    setIsComposeOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
                >
                  <Send size={14} />
                  <span>जवाफ दिनुहोस् (Reply)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Email List Table */
            <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
              {isLoading ? (
                <div className="py-20 text-center text-gray-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="mt-2 text-xs">इमेलहरू लोड हुँदैछन्...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="py-24 text-center text-gray-400">
                  <Mail size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-600">कुनै इमेल फेला परेन</p>
                  <p className="text-xs text-gray-400">यो फोल्डर खाली छ वा खोजिएको शब्द मिलेन।</p>
                </div>
              ) : (
                emails.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenEmail(item)}
                    className={`flex items-center gap-3 p-3.5 hover:bg-blue-50/40 cursor-pointer transition group ${
                      !item.isRead ? 'bg-blue-50/20 font-bold' : ''
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        starMutation.mutate(item.id);
                      }}
                      className="text-gray-300 hover:text-amber-500 transition cursor-pointer"
                    >
                      <Star
                        size={16}
                        className={item.isStarred ? 'fill-amber-400 text-amber-500' : ''}
                      />
                    </button>

                    <div className="w-40 sm:w-48 truncate text-xs text-gray-900">
                      {selectedFolder === 'SENT'
                        ? `To: ${item.toName || item.toAddress}`
                        : item.fromName || item.fromAddress}
                    </div>

                    <div className="flex-1 truncate text-xs text-gray-700">
                      <span className="font-semibold text-gray-900 mr-2">{item.subject}</span>
                      <span className="text-gray-400 font-normal">
                        — {item.body?.substring(0, 70)}...
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 whitespace-nowrap">
                      {new Date(item.receivedOrSentAt).toLocaleDateString()}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isTrash = item.folder === 'TRASH' || selectedFolder === 'TRASH';
                        const promptMsg = isTrash
                          ? 'के तपाईं यो इमेल स्थायी रूपमा मेटाउन चाहनुहुन्छ?'
                          : 'के तपाईं यो इमेल रद्दीटोकरी (Trash) मा सार्न चाहनुहुन्छ?';
                        if (confirm(promptMsg)) {
                          deleteMutation.mutate({ id: item.id, permanent: isTrash });
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title={item.folder === 'TRASH' ? 'Permanently Delete' : 'Move to Trash'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── COMPOSE EMAIL MODAL ────────────────────────────────────────── */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between bg-[#1e3a5f] p-4 text-white">
              <div className="flex items-center gap-2">
                <Send size={18} />
                <h3 className="text-sm font-bold">नयाँ इमेल पठाउनुहोस् (Compose Official Email)</h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {composeMsg && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    composeMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {composeMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{composeMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  प्राप्तकर्ताको इमेल (To Email Address) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. education@brindawanmun.gov.np, info@doe.gov.np"
                  value={composeForm.toAddress}
                  onChange={(e) => setComposeForm({ ...composeForm, toAddress: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    प्राप्तकर्ताको नाम/निकाय (Recipient Name / Org)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. वृन्दावन नगरपालिका शिक्षा शाखा"
                    value={composeForm.toName}
                    onChange={(e) => setComposeForm({ ...composeForm, toName: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    बोधार्थ (CC Email)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. edurautahat@gmail.com"
                    value={composeForm.ccAddress}
                    onChange={(e) => setComposeForm({ ...composeForm, ccAddress: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  इमेलको विषय (Subject) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. मासिक शिक्षक हाजिरी तथा विद्यार्थी प्रगति प्रतिवेदन पेश गरिएको सम्बन्धमा"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  सन्देश विवरण (Message Body) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="आदरणीय महानुभाव, ..."
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Paperclip size={13} />
                  <span>Sender: nepalsecondaryschool.bdn@gmail.com</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition cursor-pointer"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={sendMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold transition shadow-xs cursor-pointer"
                  >
                    <Send size={14} />
                    <span>{sendMutation.isPending ? 'पठाउँदै...' : 'इमेल पठाउनुहोस् (Send)'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
