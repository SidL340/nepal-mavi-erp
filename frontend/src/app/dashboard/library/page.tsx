'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Library,
  Plus,
  Search,
  BookOpen,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  CalendarClock,
  BookMarked,
  Check,
  Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

interface BulkBookRow {
  title: string;
  titleNepali: string;
  author: string;
  publisher: string;
  isbn: string;
  category: string;
  totalCopies: number;
  shelfLocation: string;
  purchasedDateBs: string;
  sourceOfFund: string;
}

const DEFAULT_CATEGORIES = [
  'कथा / साहित्य (Literature)',
  'विज्ञान तथा प्रविधि (Science & Tech)',
  'गणित (Mathematics)',
  'सामाजिक तथा इतिहास (Social & History)',
  'बाल साहित्य (Children Books)',
  'शब्दकोश / ज्ञानकोश (Dictionary / Encyclopedia)',
  'पाठ्यपुस्तक (Course / Text Books)',
  'सन्दर्भ सामग्री (Reference Materials)',
  'सामान्य ज्ञान (General Knowledge)',
  'अन्य (Other)',
];

const DEFAULT_SOURCES = [
  'सरकारी अनुदान (Government Grant)',
  'विद्यालय आफ्नै स्रोत (School Own Fund)',
  'Book Corner Grant (पुस्तक कुना)',
  'दान / सहयोग (Donation)',
  'अन्य (Other)',
];

export default function LibraryPage() {
  const { user } = useAuthStore();
  const isAdminOrLibrarian =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'books' | 'issues' | 'overdue'>('books');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Selected Issue for Reissue / Return
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [reissueDays, setReissueDays] = useState<number>(15);
  const [reissueCustomBs, setReissueCustomBs] = useState<string>('');
  const [returnFine, setReturnFine] = useState<number>(0);
  const [returnRemarks, setReturnRemarks] = useState<string>('Returned in good condition');

  // Edit Book State
  const [editingBook, setEditingBook] = useState<any>(null);
  const [editBookData, setEditBookData] = useState<any>({});


  // Bulk Rows state
  const [bulkRows, setBulkRows] = useState<BulkBookRow[]>([
    {
      title: '',
      titleNepali: '',
      author: '',
      publisher: '',
      isbn: '',
      category: 'कथा / साहित्य (Literature)',
      totalCopies: 1,
      shelfLocation: 'Rack A-1',
      purchasedDateBs: todayBS(),
      sourceOfFund: 'सरकारी अनुदान (Government Grant)',
    },
    {
      title: '',
      titleNepali: '',
      author: '',
      publisher: '',
      isbn: '',
      category: 'विज्ञान तथा प्रविधि (Science & Tech)',
      totalCopies: 1,
      shelfLocation: 'Rack A-2',
      purchasedDateBs: todayBS(),
      sourceOfFund: 'सरकारी अनुदान (Government Grant)',
    },
  ]);
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Issue modal state
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [issuedDateBs, setIssuedDateBs] = useState(todayBS());

  // Calculate 15 days ahead in BS approx
  const calculateDueBs = (days = 15) => {
    const parts = todayBS().split('-').map(Number);
    let d = parts[2] + days;
    let m = parts[1];
    let y = parts[0];
    while (d > 30) {
      d -= 30;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const [dueDateBs, setDueDateBs] = useState(calculateDueBs(15));

  // Fetch Books
  const { data: booksData, isLoading: isBooksLoading } = useQuery({
    queryKey: ['books', search],
    queryFn: async () => {
      const res = await api.get(`/library?search=${encodeURIComponent(search)}`);
      return res.data?.data || [];
    },
  });

  // Fetch Issues
  const { data: issuesData, isLoading: isIssuesLoading } = useQuery({
    queryKey: ['library-issues'],
    queryFn: async () => {
      const res = await api.get('/library/issues');
      return res.data?.data || [];
    },
  });

  // Fetch Overdue Issues
  const { data: overdueData } = useQuery({
    queryKey: ['library-overdue'],
    queryFn: async () => {
      const res = await api.get('/library/issues?overdue=true');
      return res.data?.data || [];
    },
  });

  // Fetch Student Search for issuing
  const { data: studentsList } = useQuery({
    queryKey: ['students-lib-search', studentSearch],
    queryFn: async () => {
      if (!studentSearch || studentSearch.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(studentSearch)}&limit=8`);
      return res.data?.data || [];
    },
    enabled: studentSearch.length >= 2,
  });

  // Add Single Book Mutation
  const addBookMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/library', formData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Book added to library catalog!');
      setIsAddBookModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add book');
    },
  });

  // Bulk Books Mutation
  const bulkAddMutation = useMutation({
    mutationFn: async (books: BulkBookRow[]) => {
      const validBooks = books.filter((b) => b.title && b.title.trim().length > 0);
      if (validBooks.length === 0) throw new Error('Please enter at least one book title.');
      const res = await api.post('/library/bulk', { books: validBooks });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully added ${data.count} books in bulk!`);
      setIsBulkModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to save bulk books');
    },
  });

  // Issue Book Mutation
  const issueBookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBook) throw new Error('Please select a book');
      if (!selectedStudent) throw new Error('Please select a student');
      const res = await api.post('/library/issues', {
        bookId: selectedBook.id,
        studentId: selectedStudent.id,
        issuedDateBs,
        issuedDateAd: new Date().toISOString(),
        dueDateBs,
        dueDateAd: new Date(Date.now() + 15 * 86400000).toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Book "${selectedBook?.title}" issued to ${selectedStudent?.fullName}!`);
      setIsIssueModalOpen(false);
      setSelectedBook(null);
      setSelectedStudent(null);
      setStudentSearch('');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to issue book');
    },
  });

  // Return Book Mutation
  const returnBookMutation = useMutation({
    mutationFn: async ({ issueId, fine = 0, remarks }: { issueId: number; fine?: number; remarks?: string }) => {
      const res = await api.patch(`/library/issues/${issueId}/return`, {
        returnedDateBs: todayBS(),
        returnedDateAd: new Date().toISOString(),
        fine,
        remarks,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Book marked as RETURNED!');
      setIsReturnModalOpen(false);
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-overdue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to return book');
    },
  });

  // Reissue / Renew Book Mutation
  const reissueBookMutation = useMutation({
    mutationFn: async ({ issueId, daysToAdd, customDueDateBs }: { issueId: number; daysToAdd?: number; customDueDateBs?: string }) => {
      const res = await api.patch(`/library/issues/${issueId}/reissue`, {
        daysToAdd: daysToAdd || 15,
        dueDateBs: customDueDateBs || calculateDueBs(daysToAdd || 15),
        dueDateAd: new Date(Date.now() + (daysToAdd || 15) * 86400000).toISOString(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Book reissued/renewed successfully!');
      setIsReissueModalOpen(false);
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-overdue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reissue book');
    },
  });

  // Edit Book Mutation
  const editBookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/library/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Book updated successfully!');
      setEditingBook(null);
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update book'),
  });

  // Delete Book Mutation — Direct Body POST (100% proxy-proof)
  const deleteBookMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post('/library/books-delete-direct', { id });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Book deleted from catalog.');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to delete book'),
  });

  // Delete Issue Mutation — Direct Body POST (100% proxy-proof)
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post('/library/issues-delete-direct', { id });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Issue record deleted. Book copy restored.');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-overdue'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to delete issue record'),
  });

  // Clear All Issues Mutation
  const clearAllIssuesMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/library/admin-clear-all-issues');
      if (!res.data?.success) throw new Error(res.data?.message || 'Wipe failed');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'All library issues cleared!');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-overdue'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to clear issues'),
  });

  const handleAddBook = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    addBookMutation.mutate(data);
  };

  // Bulk row helpers
  const handleBulkRowChange = (index: number, field: keyof BulkBookRow, value: any) => {
    setBulkRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        title: '',
        titleNepali: '',
        author: '',
        publisher: '',
        isbn: '',
        category: 'कथा / साहित्य (Literature)',
        totalCopies: 1,
        shelfLocation: 'Rack A-1',
        purchasedDateBs: todayBS(),
        sourceOfFund: 'सरकारी अनुदान (Government Grant)',
      },
    ]);
  };

  const handleRemoveBulkRow = (index: number) => {
    if (bulkRows.length <= 1) {
      toast.error('Must keep at least 1 row');
      return;
    }
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Parse TSV/Excel copy-pasted text
  const handleParsePastedText = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.trim().split('\n');
    const newRows: BulkBookRow[] = [];

    for (const line of lines) {
      const cols = line.split('\t').map((c) => c.trim());
      if (cols.length > 0 && cols[0]) {
        newRows.push({
          title: cols[0] || '',
          titleNepali: cols[1] || '',
          author: cols[2] || '',
          publisher: cols[3] || '',
          isbn: cols[4] || '',
          category: cols[5] || 'कथा / साहित्य (Literature)',
          totalCopies: parseInt(cols[6]) || 1,
          shelfLocation: cols[7] || 'Rack A-1',
          purchasedDateBs: cols[8] || todayBS(),
          sourceOfFund: cols[9] || 'सरकारी अनुदान (Government Grant)',
        });
      }
    }

    if (newRows.length > 0) {
      setBulkRows(newRows);
      setShowPasteBox(false);
      setPasteText('');
      toast.success(`Imported ${newRows.length} rows from Excel paste!`);
    } else {
      toast.error('Could not parse text. Ensure columns are separated by tabs.');
    }
  };

  const books = booksData || [];
  const issues = issuesData || [];
  const overdueIssues = overdueData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Library Management (पुस्तकालय व्यवस्थापन)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage catalogue, issue books, process returns & renew/reissue borrowed books
          </p>
        </div>

        {isAdminOrLibrarian && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition"
            >
              <FileSpreadsheet size={15} />
              <span>Bulk Book Entry (एकमुष्ट प्रविष्टि)</span>
            </button>

            <button
              onClick={() => setIsAddBookModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
            >
              <Plus size={15} />
              <span>Add Single Book (नयाँ पुस्तक)</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('books')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'books'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Book Catalog ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`border-b-2 px-4 py-2.5 transition ${
            activeTab === 'issues'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Issued Books ({issues.length})
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`border-b-2 px-4 py-2.5 transition relative ${
            activeTab === 'overdue'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Overdue Books ({overdueIssues.length})
          {overdueIssues.length > 0 && (
            <span className="ml-1.5 rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-mono">
              {overdueIssues.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: BOOKS CATALOG ─────────────────────────────────────────── */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author, category, ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="erp-input pl-9 text-xs"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase">Book Title</th>
                  <th className="p-3.5 font-bold uppercase">Author & Publisher</th>
                  <th className="p-3.5 font-bold uppercase">Category</th>
                  <th className="p-3.5 font-bold uppercase">Shelf / Rack</th>
                  <th className="p-3.5 font-bold uppercase text-center">Available / Total</th>
                  <th className="p-3.5 font-bold uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isBooksLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading library books...</td></tr>
                ) : books.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">No books found in catalog.</td></tr>
                ) : (
                  books.map((book: any) => (
                    <tr key={book.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <p className="font-bold text-gray-900">{book.title}</p>
                        {book.titleNepali && (
                          <p className="text-[11px] text-gray-500 font-nepali">{book.titleNepali}</p>
                        )}
                        {book.isbn && <span className="font-mono text-[10px] text-gray-400">ISBN: {book.isbn}</span>}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-gray-800">{book.author || '—'}</p>
                        <p className="text-[10px] text-gray-400">{book.publisher || '—'}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {book.category || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-600">{book.shelfLocation || 'Rack A'}</td>
                      <td className="p-3.5 text-center font-bold">
                        <span className={book.availableCopies > 0 ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                          {book.availableCopies}
                        </span>
                        <span className="text-gray-400 font-mono"> / {book.totalCopies}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {isAdminOrLibrarian && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={book.availableCopies <= 0}
                              onClick={() => {
                                setSelectedBook(book);
                                setIssuedDateBs(todayBS());
                                setDueDateBs(calculateDueBs(15));
                                setIsIssueModalOpen(true);
                              }}
                              className="rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280] disabled:opacity-40 shadow-2xs"
                            >
                              Issue
                            </button>
                            <button
                              onClick={() => {
                                setEditingBook(book);
                                setEditBookData({
                                  title: book.title,
                                  titleNepali: book.titleNepali || '',
                                  author: book.author || '',
                                  publisher: book.publisher || '',
                                  isbn: book.isbn || '',
                                  category: book.category || '',
                                  totalCopies: book.totalCopies,
                                  shelfLocation: book.shelfLocation || '',
                                  purchasedDateBs: book.purchasedDateBs || '',
                                  sourceOfFund: book.sourceOfFund || '',
                                });
                              }}
                              className="rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 p-1.5 transition"
                              title="Edit Book"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${book.title}" from catalog? This cannot be undone.`)) {
                                  deleteBookMutation.mutate(book.id);
                                }
                              }}
                              className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 p-1.5 transition"
                              title="Delete Book"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ISSUED BOOKS ──────────────────────────────────────────── */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500 font-medium">
              Showing <b>{issues.length}</b> borrowed / returned book records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  queryClient.clear();
                  queryClient.invalidateQueries({ queryKey: ['library-issues'] });
                  toast.success('Issues list refreshed!');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition"
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>

              {isAdminOrLibrarian && issues.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to CLEAR ALL ${issues.length} issued records? This will delete all issue history and restore all book copy counts in the catalog.`)) {
                      clearAllIssuesMutation.mutate();
                    }
                  }}
                  disabled={clearAllIssuesMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>{clearAllIssuesMutation.isPending ? 'Clearing...' : 'Clear All Issues (सबै खाली गर्नुहोस्)'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Book Title</th>
                <th className="p-3.5 font-bold uppercase">Student Name</th>
                <th className="p-3.5 font-bold uppercase">Issued Date (BS)</th>
                <th className="p-3.5 font-bold uppercase">Due Date (BS)</th>
                <th className="p-3.5 font-bold uppercase text-center">Status</th>
                <th className="p-3.5 font-bold uppercase text-right">Actions (कार्यहरू)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isIssuesLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading issues...</td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No books currently issued.</td></tr>
              ) : (
                issues.map((issue: any) => (
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-gray-900">{issue.book?.title}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-gray-800">{issue.student?.fullName}</p>
                      <p className="font-mono text-[10px] text-gray-400">{issue.student?.studentId}</p>
                    </td>
                    <td className="p-3.5 font-mono">{issue.issuedDateBs}</td>
                    <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{issue.dueDateBs}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${
                          issue.isReturned
                            ? 'bg-slate-100 text-gray-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.isReturned ? 'RETURNED' : 'BORROWED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {isAdminOrLibrarian && (
                        <div className="flex items-center justify-end gap-2">
                          {!issue.isReturned && (
                            <>
                              {/* Reissue / Renew Button */}
                              <button
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setReissueDays(15);
                                  setReissueCustomBs(calculateDueBs(15));
                                  setIsReissueModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100 transition shadow-2xs"
                                title="Reissue / Extend Due Date"
                              >
                                <CalendarClock size={12} />
                                <span>Reissue</span>
                              </button>

                              {/* Return Button */}
                              <button
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setReturnFine(0);
                                  setReturnRemarks('Returned in good condition');
                                  setIsReturnModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                                title="Process Book Return"
                              >
                                <RotateCcw size={12} />
                                <span>Return</span>
                              </button>
                            </>
                          )}

                          {/* Delete Issue Record */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete this issue record for "${issue.book?.title}"? Book copy will be restored to catalog.`)) {
                                deleteIssueMutation.mutate(issue.id);
                              }
                            }}
                            className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 p-1.5 transition"
                            title="Delete Issue Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* ─── TAB 3: OVERDUE BOOKS ──────────────────────────────────────────── */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600" />
              <span><b>{overdueIssues.length} book(s)</b> have exceeded the return deadline.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-rose-900 text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase">Book Title</th>
                  <th className="p-3.5 font-bold uppercase">Student Name</th>
                  <th className="p-3.5 font-bold uppercase">Student ID</th>
                  <th className="p-3.5 font-bold uppercase">Due Date (BS)</th>
                  <th className="p-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueIssues.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No overdue books! All returns on time.</td></tr>
                ) : (
                  overdueIssues.map((issue: any) => (
                    <tr key={issue.id} className="hover:bg-rose-50/40">
                      <td className="p-3.5 font-bold text-gray-900">{issue.book?.title}</td>
                      <td className="p-3.5 font-bold">{issue.student?.fullName}</td>
                      <td className="p-3.5 font-mono text-gray-500">{issue.student?.studentId}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-700">{issue.dueDateBs}</td>
                      <td className="p-3.5 text-right">
                        {isAdminOrLibrarian && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedIssue(issue);
                                setReissueDays(15);
                                setReissueCustomBs(calculateDueBs(15));
                                setIsReissueModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100 transition"
                            >
                              <CalendarClock size={12} />
                              <span>Reissue</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedIssue(issue);
                                setReturnFine(0);
                                setReturnRemarks('Returned after due date');
                                setIsReturnModalOpen(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs"
                            >
                              Process Return
                            </button>

                            {/* Delete Issue Record */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete overdue record for "${issue.book?.title}" — ${issue.student?.fullName}? Book copy will be restored.`)) {
                                  deleteIssueMutation.mutate(issue.id);
                                }
                              }}
                              className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 p-1.5 transition"
                              title="Delete this overdue record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── REISSUE / RENEW BOOK MODAL ────────────────────────────────────── */}
      {isReissueModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <CalendarClock size={18} className="text-blue-600" />
                  <span>Reissue / Renew Book (पुस्तक नवीकरण)</span>
                </h3>
                <p className="text-xs text-gray-500">Extend lending due date for the student</p>
              </div>
              <button onClick={() => setIsReissueModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="font-bold text-gray-900">{selectedIssue.book?.title}</p>
                <p className="text-gray-600">Student: <b>{selectedIssue.student?.fullName}</b> ({selectedIssue.student?.studentId})</p>
                <p className="text-blue-800 font-mono font-bold">Current Due Date: {selectedIssue.dueDateBs} BS</p>
              </div>

              {/* Extension Preset Buttons */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Select Renewal Duration (म्याद थप अवधि):</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '+7 Days (१ हप्ता)' },
                    { days: 15, label: '+15 Days (१५ दिन)' },
                    { days: 30, label: '+30 Days (१ महिना)' },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setReissueDays(preset.days);
                        setReissueCustomBs(calculateDueBs(preset.days));
                      }}
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        reissueDays === preset.days
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">New Due Date (नयाँ बुझाउने मिति BS):</label>
                <input
                  type="text"
                  value={reissueCustomBs || calculateDueBs(reissueDays)}
                  onChange={(e) => setReissueCustomBs(e.target.value)}
                  className="erp-input font-mono font-bold text-[#1e3a5f]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReissueModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reissueBookMutation.isPending}
                  onClick={() =>
                    reissueBookMutation.mutate({
                      issueId: selectedIssue.id,
                      daysToAdd: reissueDays,
                      customDueDateBs: reissueCustomBs,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {reissueBookMutation.isPending ? 'Renewing...' : 'Confirm Reissue (नवीकरण सुरक्षित गर्नुहोस्)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RETURN BOOK MODAL ──────────────────────────────────────────────── */}
      {isReturnModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <RotateCcw size={18} className="text-emerald-600" />
                  <span>Return Library Book (पुस्तक फिर्ता फारम)</span>
                </h3>
                <p className="text-xs text-gray-500">Record return & restock book into catalog</p>
              </div>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="font-bold text-gray-900">{selectedIssue.book?.title}</p>
                <p className="text-gray-600">Student: <b>{selectedIssue.student?.fullName}</b></p>
                <p className="text-gray-500 font-mono">Issued: {selectedIssue.issuedDateBs} BS • Due: {selectedIssue.dueDateBs} BS</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Return Date (फिर्ता मिति BS):</label>
                <input
                  type="text"
                  defaultValue={todayBS()}
                  readOnly
                  className="erp-input font-mono font-bold bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fine Amount (जरिवाना रकम रू - यदि भएमा):</label>
                <input
                  type="number"
                  min={0}
                  value={returnFine}
                  onChange={(e) => setReturnFine(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Condition Remarks (कैफियत):</label>
                <input
                  type="text"
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="Good condition / Clean"
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={returnBookMutation.isPending}
                  onClick={() =>
                    returnBookMutation.mutate({
                      issueId: selectedIssue.id,
                      fine: returnFine,
                      remarks: returnRemarks,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{returnBookMutation.isPending ? 'Processing...' : 'Confirm Return (फिर्ता स्वीकार्नुहोस्)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ISSUE BOOK MODAL ───────────────────────────────────────────────── */}
      {isIssueModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <BookOpen size={18} className="text-amber-500" />
                  <span>Issue Book (विद्यार्थीलाई पुस्तक निकासा)</span>
                </h3>
                <p className="text-xs text-gray-500">Book: <b>{selectedBook.title}</b></p>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Search Student (विद्यार्थी खोज्नुहोस्):</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type student name or ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="erp-input pl-9"
                  />
                </div>
              </div>

              {/* Student Results */}
              {studentsList && studentsList.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-lg">
                  {studentsList.map((st: any) => {
                    const clsName = st.classEnrollment?.[0]?.class?.name;
                    const secName = st.classEnrollment?.[0]?.class?.section;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setStudentSearch('');
                        }}
                        className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition ${
                          selectedStudent?.id === st.id ? 'bg-blue-100 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900">{st.fullName}</span>
                          <span className="inline-block rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-black font-nepali border border-purple-200">
                            {clsName ? `${clsName}${secName ? ` (${secName})` : ''}` : 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono font-bold">{st.studentId}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedStudent && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Selected Student:</span>
                    <strong className="text-sm">{selectedStudent.fullName}</strong>
                    <span className="text-xs font-mono ml-2">({selectedStudent.studentId})</span>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Issued Date (BS):</label>
                  <input
                    type="text"
                    value={issuedDateBs}
                    onChange={(e) => setIssuedDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date (BS):</label>
                  <input
                    type="text"
                    value={dueDateBs}
                    onChange={(e) => setDueDateBs(e.target.value)}
                    className="erp-input font-mono font-bold text-blue-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedStudent || issueBookMutation.isPending}
                  onClick={() => issueBookMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {issueBookMutation.isPending ? 'Issuing...' : 'Issue Book (निकासा गर्नुहोस्)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD SINGLE BOOK MODAL ──────────────────────────────────────────── */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f]">Add New Book to Catalog</h3>
              <button onClick={() => setIsAddBookModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Book Title (English) *</label>
                  <input type="text" required name="title" placeholder="e.g. Science Part 10" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Book Title (नेपाली)</label>
                  <input type="text" name="titleNepali" placeholder="विज्ञान भाग १०" className="erp-input font-nepali" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Author Name</label>
                  <input type="text" name="author" placeholder="Author name" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publisher</label>
                  <input type="text" name="publisher" placeholder="Publisher" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select name="category" className="erp-input font-semibold">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Total Copies</label>
                  <input type="number" min={1} defaultValue={1} name="totalCopies" className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Shelf / Rack</label>
                  <input type="text" name="shelfLocation" placeholder="Rack A-1" className="erp-input font-mono" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBookMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {addBookMutation.isPending ? 'Saving...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BULK BOOK ENTRY MODAL ─────────────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={18} />
                  <span>Bulk Book Entry (एकमुष्ट पुस्तक प्रविष्टि फारम)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  पुस्तकालयमा एकैपटक धेरै पुस्तकहरूको शीर्षक, लेखक, विधा, रैक नं., खरिद स्रोत र प्रति संख्या दर्ता गर्नुहोस्
                </p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-gray-600 font-semibold">
                Tip: You can add rows below or paste directly from Microsoft Excel.
              </span>
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="rounded-lg bg-white border border-gray-200 px-3 py-1 font-bold text-[#1e3a5f] hover:bg-slate-100"
              >
                {showPasteBox ? 'Hide Paste Box' : '📋 Paste from Excel / TSV'}
              </button>
            </div>

            {showPasteBox && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
                <p className="font-bold text-blue-900">
                  Paste rows copied from Excel (Columns: Title | Title Nepali | Author | Publisher | ISBN | Category | Copies | Shelf | Date BS | Source):
                </p>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste Excel tab-separated rows here..."
                  className="erp-input font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="rounded-lg bg-[#1e3a5f] text-white px-4 py-1.5 font-bold"
                >
                  Parse & Fill Rows
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 min-w-40">Book Title *</th>
                    <th className="p-2.5 min-w-36">Title (नेपाली)</th>
                    <th className="p-2.5 min-w-32">Author</th>
                    <th className="p-2.5 min-w-36">Category</th>
                    <th className="p-2.5 w-20 text-center">Copies</th>
                    <th className="p-2.5 w-24">Shelf</th>
                    <th className="p-2.5 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bulkRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono text-gray-400">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={row.title}
                          onChange={(e) => handleBulkRowChange(idx, 'title', e.target.value)}
                          placeholder="Book title *"
                          className="erp-input text-xs font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.titleNepali}
                          onChange={(e) => handleBulkRowChange(idx, 'titleNepali', e.target.value)}
                          placeholder="नेपाली शीर्षक"
                          className="erp-input text-xs font-nepali"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.author}
                          onChange={(e) => handleBulkRowChange(idx, 'author', e.target.value)}
                          placeholder="Author"
                          className="erp-input text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.category}
                          onChange={(e) => handleBulkRowChange(idx, 'category', e.target.value)}
                          className="erp-input text-xs"
                        >
                          {DEFAULT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          value={row.totalCopies}
                          onChange={(e) => handleBulkRowChange(idx, 'totalCopies', parseInt(e.target.value) || 1)}
                          className="erp-input text-xs font-mono text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.shelfLocation}
                          onChange={(e) => handleBulkRowChange(idx, 'shelfLocation', e.target.value)}
                          placeholder="Rack A-1"
                          className="erp-input text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleAddBulkRow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#1e3a5f] bg-blue-50/60 px-4 py-2 text-xs font-bold text-[#1e3a5f] hover:bg-blue-100 transition"
              >
                <Plus size={14} />
                <span>+ Add Row (थप पङ्क्ति थप्नुहोस्)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkAddMutation.isPending}
                  onClick={() => bulkAddMutation.mutate(bulkRows)}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-6 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {bulkAddMutation.isPending ? 'Saving...' : `Save ${bulkRows.filter((b) => b.title.trim()).length} Books (सुरक्षित गर्नुहोस्)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT BOOK MODAL ──────────────────────────────────────────────────── */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-[#1e3a5f]">Edit Book Details</h2>
              </div>
              <button onClick={() => setEditingBook(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Book Title (पुस्तकको शीर्षक) *</label>
                  <input
                    type="text"
                    value={editBookData.title || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Nepali Title (नेपाली शीर्षक)</label>
                  <input
                    type="text"
                    value={editBookData.titleNepali || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, titleNepali: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Author (लेखक)</label>
                  <input
                    type="text"
                    value={editBookData.author || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, author: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publisher (प्रकाशक)</label>
                  <input
                    type="text"
                    value={editBookData.publisher || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, publisher: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={editBookData.isbn || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, isbn: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category (श्रेणी)</label>
                  <select
                    value={editBookData.category || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Total Copies (कुल प्रति)</label>
                  <input
                    type="number"
                    min={1}
                    value={editBookData.totalCopies || 1}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, totalCopies: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Shelf / Rack Location</label>
                  <input
                    type="text"
                    value={editBookData.shelfLocation || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, shelfLocation: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source of Fund (स्रोत)</label>
                  <select
                    value={editBookData.sourceOfFund || ''}
                    onChange={(e) => setEditBookData((p: any) => ({ ...p, sourceOfFund: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs bg-white"
                  >
                    {DEFAULT_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button onClick={() => setEditingBook(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!editBookData.title) { toast.error('Book title is required.'); return; }
                  editBookMutation.mutate({ id: editingBook.id, data: editBookData });
                }}
                disabled={editBookMutation.isPending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {editBookMutation.isPending ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
