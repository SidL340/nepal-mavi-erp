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

  const students = studentsData || [];

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
      const symbol = generateSymbolNo('2081', currentClass?.name, roll);

      return `
        <div class="admit-card">
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div style="font-size: 10px; font-weight: bold; color: #475569;">Shree Nepal Secondary School • EMIS: 320160002</div>
            <div class="admit-badge">EXAMINATION ADMIT CARD (प्रवेश पत्र)</div>
            <div style="font-size: 11px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${examName} — 2081 BS</div>
          </div>

          <div class="body-grid">
            <div class="details">
              <div><strong>विद्यार्थीको नाम (Name):</strong> ${st.fullName}</div>
              <div><strong>Symbol No.:</strong> <span style="font-family: monospace; font-weight: 900; color: #1e3a5f;">${symbol}</span></div>
              <div><strong>कक्षा (Class):</strong> ${currentClass?.name || '—'} ${currentClass?.section ? `(${currentClass.section})` : ''}</div>
              <div><strong>रोल नं. (Roll No):</strong> ${roll}</div>
              <div><strong>IEMIS / Student ID:</strong> ${st.studentId}</div>
            </div>
            <div class="photo-box">
              फोटो<br/>(Photo)
            </div>
          </div>

          <div class="rules">
            <strong>नियम तथा निर्देशनहरू:</strong>
            १. परीक्षा सुरु हुनुभन्दा १५ मिनेट अगावै परीक्षा हलमा प्रवेश गरिसक्नुपर्नेछ।<br/>
            २. प्रवेश पत्र विना परीक्षा हलमा प्रवेश गर्न पाइने छैन। मोबाइल फोन तथा इलेक्ट्रोनिक उपकरण पूर्ण निषेध छ।
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
          <title>Admit Cards - ${currentClass?.name}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .cards-container { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
            .admit-card { border: 2px solid #1e3a5f; padding: 10px; border-radius: 6px; page-break-inside: avoid; background: #fffdfa; display: flex; flex-direction: column; justify-content: space-between; height: 132mm; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 4px; margin-bottom: 6px; }
            .school-name { font-size: 13px; font-weight: 900; color: #1e3a5f; }
            .admit-badge { font-size: 10px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 1px 8px; border-radius: 3px; margin-top: 3px; text-transform: uppercase; }
            .body-grid { display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 6px; }
            .details div { margin-bottom: 2.5px; }
            .photo-box { width: 65px; height: 75px; border: 1px dashed #64748b; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 9px; color: #64748b; background: #f8fafc; border-radius: 4px; shrink-0; }
            .rules { font-size: 8.5px; line-height: 1.4; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-bottom: 8px; }
            .footer-sig { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; margin-top: 4px; }
            .sig-line { border-top: 1px solid #333; width: 110px; text-align: center; padding-top: 2px; }
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
