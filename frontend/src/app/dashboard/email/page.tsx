'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
} from 'lucide-react';

export default function SchoolEmailPage() {
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<'INBOX' | 'SENT' | 'STARRED' | 'TRASH'>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

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
    mutationFn: async (id: number) => {
      await api.delete(`/email/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-emails'] });
      setSelectedEmail(null);
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
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                School Official Webmail (विद्यालय इमेल केन्द्र)
              </h1>
              <p className="text-xs text-gray-500">
                nepalmavibrindawan@gmail.com — आधिकारिक पत्राचार, सूचना तथा पत्राचार व्यवस्थापन
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition cursor-pointer"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-600' : ''} />
            <span>रिफ्रेस</span>
          </button>
          <button
            onClick={() => {
              setIsComposeOpen(true);
              setComposeMsg(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-xs font-bold shadow-sm transition cursor-pointer"
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
          {/* Top Search Filter */}
          <div className="p-3.5 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="विषय, प्रेषक वा सन्देश खोज्नुहोस् (Search emails)..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                        if (confirm('के तपाईं यो इमेल हटाउन चाहनुहुन्छ?')) {
                          deleteMutation.mutate(selectedEmail.id);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                      title="Delete"
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
                    className={`flex items-center gap-3 p-3.5 hover:bg-blue-50/40 cursor-pointer transition ${
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
                  <span>Sender: nepalmavibrindawan@gmail.com</span>
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
