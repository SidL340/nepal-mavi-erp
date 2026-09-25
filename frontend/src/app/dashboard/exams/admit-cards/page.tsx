'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Printer,
  Search,
  Filter,
  ArrowLeft,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export function generateSymbolNo(yearName?: string | number, className?: string, rollNo?: number | string) {
  const yearMatch = (yearName || '2083').toString().match(/\d{4}/);
  const yearStr = yearMatch ? yearMatch[0] : '2083';

  let classNum = '00';
  const classMatch = (className || '').toString().match(/\d+/);
  if (classMatch) {
    classNum = classMatch[0].padStart(2, '0');
  }

  const rollStr = (rollNo || 0).toString().padStart(2, '0');
  return `${yearStr}${classNum}${rollStr}`;
}

export default function AdmitCardsPage() {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch School
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Fetch Students for selected class
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students-for-admit', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await api.get(`/students?classId=${selectedClassId}&limit=all`);
      return res.data?.data || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch Seat Plans for selected exam
  const { data: examSeatsData } = useQuery({
    queryKey: ['seat-plans-for-admit', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const res = await api.get(`/seat-plans?examId=${selectedExamId}`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  const students = studentsData || [];
  const examSeats = examSeatsData || [];

  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s: any) => s.id));
    }
  };

  const triggerAdmitCardsPrint = () => {
    if (!selectedExamId || students.length === 0) {
      toast.error('Please select an Exam and Class with students');
      return;
    }

    const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);
    const currentClass = classesData?.find((c: any) => c.id.toString() === selectedClassId);
    const examName = currentExam?.nameNepali || currentExam?.name || 'FIRST TERMINAL EXAMINATION';
    const examYear = currentExam?.academicYear?.year || '2081';

    // Find shift for this class
    const examShifts = currentExam?.shifts || [];
    let matchedShift = examShifts.find((sh: any) => {
      let cids: number[] = [];
      try {
        cids = typeof sh.classIds === 'string' ? JSON.parse(sh.classIds) : (sh.classIds || []);
      } catch {
        cids = [];
      }
      return cids.includes(parseInt(selectedClassId));
    });

    if (!matchedShift && examShifts.length > 0) {
      matchedShift = examShifts[0];
    }

    const shiftDisplay = matchedShift
      ? `${matchedShift.nameNepali || matchedShift.name} Shift (${matchedShift.startTime || ''} - ${matchedShift.endTime || ''})`
      : `${currentExam?.shift || 'DAY'} Shift`;

    // Filter schedules for this class
    const classSchedules = (currentExam?.schedules || []).filter(
      (sch: any) => sch.classId?.toString() === selectedClassId
    );

    const routineRowsHtml = classSchedules.length > 0
      ? classSchedules.map((sch: any) => `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; font-family: monospace;">${sch.examDateBs || sch.examDate || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 2px 4px; font-weight: bold; color: #0f172a;">${sch.subject?.name || sch.subjectName || 'Subject'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center;">${sch.startTime || matchedShift?.startTime || '07:00 AM'} - ${sch.endTime || matchedShift?.endTime || '10:00 AM'}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align: center; color: #64748b; font-style: italic;">
              Shift Timing: ${shiftDisplay}
            </td>
          </tr>
        `;

    const targetStudents = selectedStudentIds.length > 0
      ? students.filter((s: any) => selectedStudentIds.includes(s.id))
      : students;

    if (targetStudents.length === 0) {
      toast.error('No students selected for printing');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const cardsHtml = targetStudents.map((st: any, idx: number) => {
      const roll = st.classEnrollment?.[0]?.rollNo || (idx + 1);
      const symbol = generateSymbolNo(examYear, currentClass?.name, roll);

      // Find seat allocation for this student
      const seat = examSeats.find((s: any) => s.studentId === st.id);
      const seatLocationText = seat
        ? `${seat.room?.roomNo || 'Room'} • Bench #${seat.benchNo} (${seat.seatPosition})`
        : 'Exam Hall / As Assigned';

      return `
        <div class="admit-card">
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div style="font-size: 9.5px; font-weight: bold; color: #475569;">Shree Nepal Secondary School • EMIS: 320160002</div>
            <div class="admit-badge">EXAMINATION ADMIT CARD (प्रवेश पत्र)</div>
            <div style="font-size: 10.5px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${examName} — ${examYear} BS</div>
            <div style="font-size: 9.5px; font-weight: bold; color: #0284c7; margin-top: 1px;">⏱️ ${shiftDisplay}</div>
          </div>

          <div class="body-grid">
            <div class="details">
              <div><strong>विद्यार्थीको नाम:</strong> <span style="font-size: 11px; font-weight: 900; color: #0f172a;">${st.fullName}</span></div>
              <div><strong>Symbol No.:</strong> <span style="font-family: monospace; font-weight: 900; color: #1e3a5f; background: #e0f2fe; padding: 1px 4px; border-radius: 3px;">${symbol}</span></div>
              <div><strong>कक्षा (Class):</strong> ${currentClass?.name || '—'} ${currentClass?.section ? `(${currentClass.section})` : ''}</div>
              <div><strong>रोल नं. (Roll No):</strong> <span style="font-weight: 800;">${roll}</span> &nbsp;|&nbsp; <strong>ID:</strong> ${st.studentId}</div>
              <div><strong>परीक्षा सिट (Seat):</strong> <span style="font-weight: bold; color: #047857;">${seatLocationText}</span></div>
            </div>
            <div class="photo-box">
              फोटो<br/>(Photo)
            </div>
          </div>

          <div class="routine-box">
            <div style="font-size: 8.5px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; margin-bottom: 2px;">
              📅 Exam Subject Timetable (विषयगत परीक्षा तालिका):
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
              <thead>
                <tr style="background: #f1f5f9; color: #334155; font-weight: bold;">
                  <th style="border: 1px solid #cbd5e1; padding: 2px 4px; width: 65px; text-align: center;">Date (मिति)</th>
                  <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left;">Subject (विषय)</th>
                  <th style="border: 1px solid #cbd5e1; padding: 2px 4px; width: 110px; text-align: center;">Time (समय)</th>
                </tr>
              </thead>
              <tbody>
                ${routineRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="rules">
            <strong>नियम:</strong> १. परीक्षा सुरु हुनुभन्दा १५ मिनेट अगावै तोकिएको सिटमा उपस्थित हुनुपर्नेछ। २. प्रवेश पत्र अनिवार्य छ।
          </div>

          <div class="footer-sig">
            <div class="sig-line">परीक्षा नियन्त्रक (Exam Controller)</div>
            <div class="sig-line">प्रधानाध्यापक (Headmaster Stamp)</div>
          </div>
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admit Cards - ${currentClass?.name} - ${examName}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .cards-container { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
            .admit-card { border: 2px solid #1e3a5f; padding: 8px 10px; border-radius: 6px; page-break-inside: avoid; background: #fffdfa; display: flex; flex-direction: column; justify-content: space-between; height: 135mm; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px; margin-bottom: 4px; }
            .school-name { font-size: 12px; font-weight: 900; color: #1e3a5f; }
            .admit-badge { font-size: 9.5px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 1px 7px; border-radius: 3px; margin-top: 2px; text-transform: uppercase; }
            .body-grid { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; }
            .details div { margin-bottom: 2px; }
            .photo-box { width: 60px; height: 68px; border: 1px dashed #64748b; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8.5px; color: #64748b; background: #f8fafc; border-radius: 4px; shrink-0; }
            .routine-box { margin-bottom: 4px; }
            .rules { font-size: 8px; line-height: 1.3; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-bottom: 4px; }
            .footer-sig { display: flex; justify-content: space-between; font-size: 8.5px; font-weight: bold; margin-top: 2px; }
            .sig-line { border-top: 1px solid #333; width: 105px; text-align: center; padding-top: 2px; }
          </style>
        </head>
        <body>
          <div class="cards-container">
            ${cardsHtml}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#1e3a5f] transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Exams</span>
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Award className="text-[#1e3a5f]" />
            <span>Admit Card Generator (परीक्षा प्रवेश पत्र)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            कक्षागत प्रवेश पत्र निर्माण, सिम्बोल नम्बर व्यवस्थापन र A4 सिधै प्रिन्ट
          </p>
        </div>

        <button
          onClick={triggerAdmitCardsPrint}
          disabled={!selectedExamId || students.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2a5280] shadow-md transition disabled:opacity-50"
        >
          <Printer size={16} />
          <span>Print Batch Admit Cards (प्रवेश पत्र प्रिन्ट)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs text-xs">
        <div>
          <label className="block font-bold text-gray-700 mb-1">Select Examination (परीक्षा):</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="erp-input font-bold text-[#1e3a5f]"
          >
            <option value="">-- Choose Exam --</option>
            {examsData?.map((ex: any) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.nameNepali || 'नेपाली'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Select Class (कक्षा):</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="erp-input font-semibold"
          >
            <option value="">-- Choose Class --</option>
            {classesData?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Checklist */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#1e3a5f]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1e3a5f]">
              Students for Admit Card Generation ({students.length} found)
            </h3>
          </div>

          {students.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All Students'}
            </button>
          )}
        </div>

        {isStudentsLoading ? (
          <div className="py-12 text-center text-gray-400">Loading student roll...</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Please select a class above to view enrolled students.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {students.map((st: any, idx: number) => {
              const roll = st.classEnrollment?.[0]?.rollNo || (idx + 1);
              const isChecked = selectedStudentIds.includes(st.id);
              return (
                <label
                  key={st.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isChecked
                      ? 'border-[#1e3a5f] bg-blue-50/40 ring-1 ring-[#1e3a5f]'
                      : 'border-gray-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleStudent(st.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-gray-900 truncate">{st.fullName}</p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Roll: {roll} | ID: {st.studentId}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
