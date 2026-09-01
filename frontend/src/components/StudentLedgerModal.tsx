'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  FileText,
  Printer,
  X,
  School as SchoolIcon,
  Stamp,
  Wallet,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentLedgerModalProps {
  studentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentLedgerModal({ studentId, isOpen, onClose }: StudentLedgerModalProps) {
  // Fetch School Profile for Header & Seal
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
    enabled: isOpen,
  });

  // Fetch Student Payment Ledger
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['student-ledger', studentId],
    queryFn: async () => {
      const res = await api.get(`/income/student-ledger/${studentId}`);
      return res.data?.data;
    },
    enabled: isOpen && !!studentId,
  });

  if (!isOpen) return null;

  const student = ledgerData?.student || {};
  const items = ledgerData?.items || [];
  const totalBilled = ledgerData?.totalBilled || 0;
  const totalPaid = ledgerData?.totalPaid || 0;
  const netOutstanding = ledgerData?.netOutstanding || 0;

  // Export Student Ledger to Excel / CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Date BS', 'Transaction Type', 'Particulars / Head', 'Billed Amount (Dr. Rs)', 'Paid Amount (Cr. Rs)', 'Running Balance (Rs)', 'Receipt / Ref', 'Remarks'];
      const rows = items.map((e: any) => [
        `"${e.dateBs}"`,
        `"${e.type}"`,
        `"${e.particulars.replace(/"/g, '""')}"`,
        e.billedAmount,
        e.paidAmount,
        e.runningBalance,
        `"${e.receiptNo || e.paymentMedium || ''}"`,
        `"${(e.remarks || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Student_Statement_${student.studentId}_${todayBS()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Student Ledger exported to Excel!');
    } catch (err) {
      toast.error('Failed to export ledger.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[#1e3a5f]" />
            <div>
              <h3 className="font-extrabold text-sm text-[#1e3a5f]">
                Student Payment Ledger & Account Statement (विद्यार्थी व्यक्तिगत शुल्क खाता)
              </h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                {student.fullName} ({student.studentId}) • कुल बक्यौता: रू {netOutstanding.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white px-3.5 py-2 text-xs font-bold transition"
            >
              <FileSpreadsheet size={15} />
              <span>Export CSV (एक्सेल)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a5280] px-4 py-2 text-xs font-bold transition shadow-2xs"
            >
              <Printer size={15} />
              <span>Print Statement (खाता प्रिन्ट)</span>
            </button>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
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
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block bg-[#1e3a5f] text-white font-extrabold px-3 py-1 rounded text-xs tracking-wider uppercase">
                STUDENT STATEMENT OF ACCOUNT
              </span>
              <p className="font-mono text-[11px] text-gray-600 block">Date Generated: {todayBS()}</p>
            </div>
          </div>

          {/* Student Info Card */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-gray-500 font-bold block text-[9px] uppercase">Student Name:</span>
              <strong className="text-gray-900 text-xs">{student.fullName}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-bold block text-[9px] uppercase">Student / EMIS ID:</span>
              <strong className="text-[#1e3a5f] font-mono font-bold">{student.studentId}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-bold block text-[9px] uppercase">Guardian Contact:</span>
              <strong className="text-gray-900 font-mono">{student.guardianContact || student.phone || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-bold block text-[9px] uppercase">Net Due Balance (बक्यौता):</span>
              <strong className={`font-mono text-xs font-black ${netOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {netOutstanding > 0 ? `Rs. ${netOutstanding.toLocaleString()}` : 'Rs. 0 (चुक्ता / Paid)'}
              </strong>
            </div>
          </div>

          {/* Ledger Table */}
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-[#1e3a5f] text-white font-bold text-center">
                <th className="border border-gray-400 p-2 w-24">Date (BS)</th>
                <th className="border border-gray-400 p-2 text-left">Particulars / Fee Head Description</th>
                <th className="border border-gray-400 p-2 w-28 text-right">Billed Due (Dr. Rs)</th>
                <th className="border border-gray-400 p-2 w-28 text-right">Paid Amount (Cr. Rs)</th>
                <th className="border border-gray-400 p-2 w-28 text-right">Balance (बक्यौता Rs)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading student ledger statement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No fee billing or payment history recorded.</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className={item.type === 'PAYMENT' ? 'bg-emerald-50/30' : ''}>
                    <td className="border border-gray-400 p-2 font-mono text-center">{item.dateBs}</td>
                    <td className="border border-gray-400 p-2 font-semibold">
                      {item.particulars}
                      {item.remarks && <span className="text-[10px] text-gray-500 block italic">{item.remarks}</span>}
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono font-bold text-rose-800">
                      {item.billedAmount > 0 ? `Rs. ${item.billedAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono font-bold text-emerald-800">
                      {item.paidAmount > 0 ? `Rs. ${item.paidAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono font-black text-gray-900">
                      Rs. {Math.max(0, item.runningBalance).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}

              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className="border border-gray-400 p-2 text-right uppercase">Total Statement Summary:</td>
                <td className="border border-gray-400 p-2 text-right font-mono text-xs text-rose-900">
                  Rs. {totalBilled.toLocaleString()}
                </td>
                <td className="border border-gray-400 p-2 text-right font-mono text-xs text-emerald-900">
                  Rs. {totalPaid.toLocaleString()}
                </td>
                <td className={`border border-gray-400 p-2 text-right font-mono text-sm font-black ${netOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {netOutstanding > 0 ? `Rs. ${netOutstanding.toLocaleString()}` : 'Rs. 0 (चुक्ता)'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature & Seal Footer */}
          <div className="pt-8 flex items-end justify-between text-center">
            <div className="space-y-1">
              <div className="w-32 border-b border-gray-400 mx-auto" />
              <span className="text-[10px] font-bold text-gray-600 uppercase block">लेखापाल (Accountant)</span>
            </div>

            <div className="h-16 w-16 flex items-center justify-center relative">
              {school.sealUrl ? (
                <img src={school.sealUrl} alt="Official Seal" className="h-full w-full object-contain opacity-90 rotate-[-5deg]" />
              ) : (
                <div className="h-14 w-14 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center text-[9px] font-bold text-red-500 rotate-[-12deg]">
                  OFFICIAL SEAL
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="w-32 border-b border-gray-400 mx-auto" />
              <span className="text-[10px] font-bold text-gray-600 uppercase block">प्रधानाध्यापक (Headmaster)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
