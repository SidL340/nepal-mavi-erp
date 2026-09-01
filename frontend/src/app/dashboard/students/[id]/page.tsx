'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  User,
  School as SchoolIcon,
  Calendar,
  Phone,
  MapPin,
  Receipt,
  Award,
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  KeyRound,
  FileText,
  BookOpen,
  Printer,
  X,
  Stamp,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { todayBSFormatted } from '@/lib/nepali-date';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'fees' | 'library' | 'certificates'>('profile');

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data?.data;
    },
  });

  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Student not found.</p>
        <Link href="/dashboard/students" className="mt-2 text-xs font-bold text-blue-600 underline">
          Back to Students
        </Link>
      </div>
    );
  }

  const enrollment = student.classEnrollment?.[0];
  const libraryIssues = student.libraryIssues || [];
  const activeLibraryIssues = libraryIssues.filter((i: any) => !i.isReturned);
  const feeCollections = student.feeCollections || [];
  const totalFeesPaid = feeCollections.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

  const triggerStudentReceiptPrint = () => {
    if (!selectedReceipt) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const r = selectedReceipt;
    const st = student || {};

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${r.receiptNo || 'Receipt'}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 15px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 10px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 4px; uppercase; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 10px; font-weight: bold; color: #4b5563;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
              <div class="badge" style="margin-top: 4px;">OFFICIAL FEE RECEIPT (शुल्क रसिद)</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5px; margin-bottom: 8px;">
              <span>Receipt No: <strong>${r.receiptNo || 'REC-001'}</strong></span>
              <span>Date: <strong>${r.paidDateBs || todayBSFormatted()} BS</strong></span>
            </div>

            <div class="grid">
              <div>Student Name: <strong>${st.fullName || r.studentName || '—'}</strong></div>
              <div>Class & Roll: <strong>${st.classEnrollment?.[0]?.class?.name || '—'} (Roll #${st.classEnrollment?.[0]?.rollNo || '—'})</strong></div>
              <div>EMIS ID: <strong>${st.studentId || '—'}</strong></div>
              <div>Fee Head: <strong>${r.feeHead?.name || r.feeHeadName || 'School Fee'}</strong></div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; color: #065f46;">TOTAL PAID AMOUNT (जम्मा भुक्तानी):</span>
              <strong style="font-size: 16px; color: #047857; font-family: monospace;">रू ${(r.amount || 0).toLocaleString()}</strong>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Depositor Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
            </div>
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
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Students List</span>
        </Link>

        <span className="text-xs font-mono font-bold text-gray-500">
          Student ID: <b className="text-[#1e3a5f]">{student.studentId}</b>
        </span>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#1e3a5f] text-white font-black text-xl shadow-sm overflow-hidden flex items-center justify-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
              ) : (
                student.fullName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-900">{student.fullName}</h1>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {student.fullNameNepali && (
                <p className="text-xs text-gray-500 font-nepali">{student.fullNameNepali}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                  EMIS ID: {student.emisId || student.studentId}
                </span>
                {enrollment?.class && (
                  <span className="font-semibold text-blue-700">
                    {enrollment.class.name} {enrollment.class.section ? `(${enrollment.class.section})` : ''}
                    {enrollment.rollNo ? ` • Roll No: ${enrollment.rollNo}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Fees Paid</span>
              <p className="text-lg font-black text-emerald-700 font-mono">रू {totalFeesPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 mt-6 gap-2 overflow-x-auto text-xs font-bold">
          {[
            { id: 'profile', label: 'Personal Profile', count: null },
            { id: 'attendance', label: 'Attendance Records', count: student.attendances?.length },
            { id: 'fees', label: `Fee Receipts (${feeCollections.length})`, count: feeCollections.length },
            { id: 'library', label: `Library Status (${activeLibraryIssues.length} Borrowed)`, count: activeLibraryIssues.length },
            { id: 'certificates', label: 'Certificates', count: student.certificates?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <User size={16} className="text-[#1e3a5f]" />
              <span>Personal Information</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block">Gender</span>
                <span className="font-semibold text-gray-800">{student.gender || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Date of Birth (BS)</span>
                <span className="font-semibold text-gray-800">{student.dateOfBirthBs || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Blood Group</span>
                <span className="font-semibold text-gray-800">{student.bloodGroup || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Mother Tongue</span>
                <span className="font-semibold text-gray-800">{student.ethnicity || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Disability Status</span>
                <span className="font-semibold text-gray-800">{student.disability || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Admission Date (BS)</span>
                <span className="font-semibold text-gray-800">{student.admissionDateBs || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Phone size={16} className="text-[#1e3a5f]" />
              <span>Parents & Guardian Contact</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block">Father's Name</span>
                <span className="font-semibold text-gray-800">{student.fatherName || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Mother's Name</span>
                <span className="font-semibold text-gray-800">{student.motherName || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Guardian Name & Relation</span>
                <span className="font-semibold text-gray-800">
                  {student.guardianName || '—'} {student.guardianRelation ? `(${student.guardianRelation})` : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Primary Contact Number</span>
                <span className="font-mono font-bold text-[#1e3a5f] text-sm">
                  {student.guardianContact || student.phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Permanent Address</span>
                <span className="font-semibold text-gray-800">{student.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarCheck size={16} className="text-emerald-600" />
            <span>Recent Attendance Logs</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Date (BS)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Remarks / Leave Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.attendances?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-400">No attendance entries recorded yet.</td>
                  </tr>
                ) : (
                  student.attendances?.map((att: any) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-gray-800">{att.dateBs}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : att.status === 'ABSENT'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{att.remark || att.leaveType || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Fees & Receipts */}
      {activeTab === 'fees' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Receipt size={16} className="text-amber-600" />
                <span>Paid Fee Receipts (शुल्क रसिद खाता)</span>
              </h2>
              <p className="text-xs text-gray-500">Official receipts issued for admission, monthly fees & lab charges</p>
            </div>
            <Link
              href={`/dashboard/finance/fees?studentId=${student.id}`}
              className="rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280] shadow-xs"
            >
              Collect New Fee
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Fee Title</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Paid Date (BS)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feeCollections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">No fee payments recorded.</td>
                  </tr>
                ) : (
                  feeCollections.map((fee: any) => (
                    <tr key={fee.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#1e3a5f]">{fee.receiptNo}</td>
                      <td className="p-3 font-semibold text-gray-800">{fee.feeHead?.name || 'Fee'}</td>
                      <td className="p-3 font-bold text-emerald-700">रू {fee.amount.toLocaleString()}</td>
                      <td className="p-3 font-mono text-gray-600">
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {fee.paymentMedium || 'CASH'}
                        </span>
                        {fee.paymentRef && <span className="text-[10px] text-gray-400 ml-1">({fee.paymentRef})</span>}
                      </td>
                      <td className="p-3 text-gray-600">{fee.paidDateBs}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(fee)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 py-1 text-xs font-extrabold shadow-2xs"
                        >
                          <Printer size={12} />
                          <span>Print Receipt (भौचर)</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Library Status */}
      {activeTab === 'library' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={16} className="text-purple-600" />
                <span>Student Library Status (पुस्तकालय विवरण)</span>
              </h2>
              <p className="text-xs text-gray-500">Books currently issued, return history & due date alerts</p>
            </div>
            <Link
              href="/dashboard/library"
              className="rounded-xl bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-800 shadow-xs"
            >
              Go to Library Catalog
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-purple-50 p-3.5 border border-purple-100">
              <span className="text-[10px] font-bold uppercase text-purple-700 block">Total Issued Books</span>
              <p className="text-xl font-black text-purple-900 mt-0.5">{libraryIssues.length}</p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-100">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Currently Borrowed</span>
              <p className="text-xl font-black text-amber-900 mt-0.5">{activeLibraryIssues.length}</p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Returned Books</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">
                {libraryIssues.filter((i: any) => i.isReturned).length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Book Title</th>
                  <th className="p-3">Issued Date (BS)</th>
                  <th className="p-3">Due Date (BS)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Fine (रू)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {libraryIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">No library books borrowed by this student.</td>
                  </tr>
                ) : (
                  libraryIssues.map((issue: any) => (
                    <tr key={issue.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-gray-900">{issue.book?.title}</td>
                      <td className="p-3 font-mono text-gray-600">{issue.issuedDateBs}</td>
                      <td className="p-3 font-mono font-bold text-[#1e3a5f]">{issue.dueDateBs}</td>
                      <td className="p-3 text-center">
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
                      <td className="p-3 text-right font-mono font-bold text-rose-700">
                        {issue.fine > 0 ? `Rs. ${issue.fine}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Certificates */}
      {activeTab === 'certificates' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award size={16} className="text-purple-600" />
              <span>Issued Character & Transfer Certificates</span>
            </h2>
            <Link
              href="/dashboard/certificates"
              className="rounded-xl bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-800 shadow-xs"
            >
              Issue Certificate
            </Link>
          </div>

          <div className="space-y-3">
            {student.certificates?.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No certificates issued yet.</p>
            ) : (
              student.certificates?.map((cert: any) => (
                <div key={cert.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-slate-50">
                  <div>
                    <span className="font-bold text-xs text-gray-900">{cert.type} CERTIFICATE</span>
                    <p className="text-[11px] text-gray-500 font-mono">No: {cert.certificateNo} | Date: {cert.issuedDateBs}</p>
                  </div>
                  <span className="text-xs font-semibold text-purple-700">Issued by {cert.issuedBy || 'Principal'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── PRINTABLE JOURNAL FEE RECEIPT MODAL ────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <span className="font-extrabold text-[#1e3a5f] text-sm">Official Fee Receipt / Journal Voucher</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerStudentReceiptPrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2a5280]"
                >
                  <Printer size={14} />
                  <span>Print Receipt (प्रिन्ट)</span>
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Journal Voucher Sheet */}
            <div className="printable-document border-2 border-[#1e3a5f] p-6 rounded-2xl bg-white space-y-4 text-xs font-sans">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl border border-gray-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                    ) : (
                      <SchoolIcon className="h-10 w-10 text-[#1e3a5f]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#1e3a5f] tracking-wide uppercase">
                      {school.name || 'Nepal Model Secondary School'}
                    </h2>
                    <h3 className="text-xs font-bold text-gray-800 font-nepali">
                      {school.nameNepali || 'नेपाल आदर्श माध्यमिक विद्यालय'}
                    </h3>
                    <p className="text-[10px] text-gray-600">
                      {school.address || 'Kathmandu, Nepal'} • IEMIS: <b className="font-mono">{school.emisCode || 'ABC123'}</b>
                    </p>
                    <p className="text-[10px] text-gray-600">Phone: {school.phone || '01-4000000'}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block bg-[#1e3a5f] text-white font-extrabold px-3 py-1 rounded text-xs tracking-wide">
                    JOURNAL FEE RECEIPT
                  </span>
                  <p className="font-mono font-bold text-sm text-[#1e3a5f] mt-1">No: {selectedReceipt.receiptNo}</p>
                  <p className="font-mono text-[11px] text-gray-600">Date (BS): {selectedReceipt.paidDateBs}</p>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Student Name:</span>
                  <strong className="text-sm text-gray-900">{student.fullName}</strong>
                  {student.fullNameNepali && <span className="block text-[11px] text-gray-500 font-nepali">{student.fullNameNepali}</span>}
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Student ID / EMIS Code:</span>
                  <strong className="font-mono text-sm text-[#1e3a5f]">{student.studentId}</strong>
                  {enrollment?.class && (
                    <span className="block text-[11px] text-gray-700 font-bold">
                      {enrollment.class.name} {enrollment.class.section ? `(${enrollment.class.section})` : ''} • Roll: {enrollment.rollNo || '1'}
                    </span>
                  )}
                </div>
              </div>

              {/* Table of Fee Items */}
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white font-bold">
                    <th className="border border-gray-300 p-2 w-12 text-center">S.N.</th>
                    <th className="border border-gray-300 p-2 text-left">Fee Head / Description</th>
                    <th className="border border-gray-300 p-2 w-28 text-right">Amount (रू)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2.5 text-center font-mono">1</td>
                    <td className="border border-gray-300 p-2.5 font-bold text-gray-900">
                      {selectedReceipt.feeHead?.name || 'School Fee Payment'}
                    </td>
                    <td className="border border-gray-300 p-2.5 text-right font-mono font-bold text-emerald-800">
                      Rs. {selectedReceipt.amount?.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={2} className="border border-gray-300 p-2 text-right uppercase">
                      Total Paid Amount (कुल जम्मा):
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono text-sm text-[#1e3a5f]">
                      Rs. {selectedReceipt.amount?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Medium & Reference */}
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Payment Medium / Mode:</span>
                  <strong className="text-[#1e3a5f] font-mono text-xs font-black uppercase">
                    {selectedReceipt.paymentMedium || 'CASH'}
                  </strong>
                  {selectedReceipt.paymentRef && (
                    <span className="text-[11px] text-gray-600 font-mono ml-2">Ref: {selectedReceipt.paymentRef}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Received / Collected By:</span>
                  <strong className="text-gray-900 font-sans text-xs">
                    {selectedReceipt.collectedBy || 'School Accountant'}
                  </strong>
                </div>
              </div>

              {/* Signatures & School Seal Block */}
              <div className="pt-8 flex items-end justify-between text-center">
                <div className="space-y-1">
                  <div className="w-36 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">Student / Guardian Sign</span>
                </div>

                {/* Official Stamp / Seal Area */}
                <div className="h-20 w-20 flex items-center justify-center relative">
                  {school.sealUrl ? (
                    <img src={school.sealUrl} alt="Official Seal" className="h-full w-full object-contain opacity-90 rotate-[-5deg]" />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center text-[10px] font-bold text-red-500 rotate-[-12deg]">
                      SCHOOL SEAL
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="w-36 border-b border-gray-400 mx-auto" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">Accountant / Cashier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
