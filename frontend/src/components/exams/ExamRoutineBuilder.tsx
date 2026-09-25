'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Layers,
  Edit2,
  CheckCircle2,
  X,
  Sun,
  Moon,
  Users,
  BookOpen,
  ArrowRight,
  Filter,
  LayoutGrid,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

interface ExamRoutineBuilderProps {
  initialExamId?: string | number;
  exams?: any[];
  classes?: any[];
  onNavigateToSeatPlan?: (examId: string, shiftName: string) => void;
}

export default function ExamRoutineBuilder({ initialExamId, exams: initialExams, classes: initialClasses, onNavigateToSeatPlan }: ExamRoutineBuilderProps) {
  const { user } = useAuthStore();
  const isAdminOrIncharge =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    ((user?.teacher as any)?.inchargeRole || '').toUpperCase().includes('EXAM');

  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId ? String(initialExamId) : '');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  // Shifts management modal
  const [isShiftsModalOpen, setIsShiftsModalOpen] = useState(false);
  const [shiftsList, setShiftsList] = useState<
    Array<{ name: string; nameNepali?: string; startTime: string; endTime: string; classIds: number[] }>
  >([
    { name: 'Morning Shift', nameNepali: 'बिहानी सिफ्ट', startTime: '07:00 AM', endTime: '10:00 AM', classIds: [] },
    { name: 'Day Shift', nameNepali: 'दिउँसो सिफ्ट', startTime: '11:00 AM', endTime: '02:00 PM', classIds: [] },
  ]);

  // Add Single Routine Entry Modal
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [entryDateBs, setEntryDateBs] = useState(todayBS());
  const [entryDayName, setEntryDayName] = useState('आइतबार (Sunday)');
  const [entryShiftId, setEntryShiftId] = useState<string>('');
  const [entryShiftName, setEntryShiftName] = useState<string>('Day Shift');
  const [entryClassId, setEntryClassId] = useState<string>('');
  const [entrySubjectId, setEntrySubjectId] = useState<string>('');
  const [entryStartTime, setEntryStartTime] = useState('11:00 AM');
  const [entryEndTime, setEntryEndTime] = useState('02:00 PM');
  const [entryRoomNo, setEntryRoomNo] = useState('');
  const [entryRemarks, setEntryRemarks] = useState('');

  // Quick Auto-Planner Modal
  const [isAutoPlannerOpen, setIsAutoPlannerOpen] = useState(false);
  const [autoStartDateBs, setAutoStartDateBs] = useState(todayBS());
  const [autoClassIds, setAutoClassIds] = useState<number[]>([]);

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

  // Fetch Subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Set default exam
  useEffect(() => {
    if (examsData?.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].id.toString());
    }
  }, [examsData, selectedExamId]);

  const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);

  // Fetch Shifts for selected Exam
  const { data: examShiftsData } = useQuery({
    queryKey: ['exam-shifts', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const res = await api.get(`/exams/${selectedExamId}/shifts`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  // Fetch Schedules for selected Exam
  const { data: schedulesData, isLoading: isSchedulesLoading } = useQuery({
    queryKey: ['exam-schedules', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const res = await api.get(`/exams/${selectedExamId}/schedules`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  // Populate shifts modal when examShiftsData loads
  useEffect(() => {
    if (examShiftsData && examShiftsData.length > 0) {
      setShiftsList(
        examShiftsData.map((s: any) => ({
          name: s.name,
          nameNepali: s.nameNepali || '',
          startTime: s.startTime,
          endTime: s.endTime,
          classIds: s.classIds ? (typeof s.classIds === 'string' ? JSON.parse(s.classIds) : s.classIds) : [],
        }))
      );
    } else if (classesData && classesData.length > 0) {
      // Smart default: Senior classes (8, 9, 10, 11, 12) in morning, Primary (1-7) in day
      const seniorClassIds = classesData
        .filter((c: any) => {
          const match = c.name.match(/\d+/);
          const num = match ? parseInt(match[0]) : 0;
          return num >= 8;
        })
        .map((c: any) => c.id);

      const juniorClassIds = classesData
        .filter((c: any) => !seniorClassIds.includes(c.id))
        .map((c: any) => c.id);

      setShiftsList([
        {
          name: 'Morning Shift (बिहानी सत्र)',
          nameNepali: 'बिहानी सिफ्ट',
          startTime: '07:00 AM',
          endTime: '10:00 AM',
          classIds: seniorClassIds.length > 0 ? seniorClassIds : [classesData[0]?.id],
        },
        {
          name: 'Day Shift (दिवा सत्र)',
          nameNepali: 'दिउँसो सिफ्ट',
          startTime: '11:00 AM',
          endTime: '02:00 PM',
          classIds: juniorClassIds.length > 0 ? juniorClassIds : classesData.map((c: any) => c.id),
        },
      ]);
    }
  }, [examShiftsData, classesData]);

  // Save Shifts Mutation
  const saveShiftsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) throw new Error('No exam selected');
      const res = await api.post(`/exams/${selectedExamId}/shifts`, {
        shifts: shiftsList,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Exam shifts saved successfully!');
      setIsShiftsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exam-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save shifts');
    },
  });

  // Save Single Routine Entry Mutation
  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !entryClassId || !entrySubjectId || !entryDateBs) {
        throw new Error('Please fill in Date, Class, and Subject');
      }
      const res = await api.post(`/exams/${selectedExamId}/schedules`, {
        schedules: [
          {
            examDateBs: entryDateBs,
            dayName: entryDayName,
            classId: parseInt(entryClassId),
            subjectId: parseInt(entrySubjectId),
            shiftId: entryShiftId ? parseInt(entryShiftId) : null,
            shiftName: entryShiftName,
            startTime: entryStartTime,
            endTime: entryEndTime,
            roomNo: entryRoomNo || null,
            remarks: entryRemarks || null,
          },
        ],
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Exam routine entry saved!');
      setIsAddEntryModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save routine entry');
    },
  });

  // Delete Routine Entry Mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/exams/${selectedExamId}/schedules/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Routine entry removed');
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete routine entry');
    },
  });

  // Auto Generate Routine Mutation
  const autoPlannerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || autoClassIds.length === 0 || !autoStartDateBs) {
        throw new Error('Please select an Exam, Start Date, and at least one Class');
      }

      // Find subjects for each selected class
      const newSchedules: any[] = [];
      const dayNames = ['आइतबार (Sun)', 'सोमबार (Mon)', 'मंगलबार (Tue)', 'बुधबार (Wed)', 'बिहीबार (Thu)', 'शुक्रबार (Fri)'];

      // Parse start date parts: "2083-05-15"
      const [yearStr, monthStr, dayStr] = autoStartDateBs.split('-');
      const y = parseInt(yearStr) || 2083;
      const m = parseInt(monthStr) || 5;
      let d = parseInt(dayStr) || 15;

      // Group classes
      for (const cid of autoClassIds) {
        const clsObj = classesData?.find((c: any) => c.id === cid);
        const classSubjects = clsObj?.subjects || [];
        const targetSubjects = classSubjects.length > 0 ? classSubjects.map((cs: any) => cs.subject) : subjectsData?.slice(0, 6) || [];

        // Determine shift for this class
        const shiftObj = examShiftsData?.find((s: any) => {
          const ids = s.classIds ? (typeof s.classIds === 'string' ? JSON.parse(s.classIds) : s.classIds) : [];
          return ids.includes(cid);
        }) || examShiftsData?.[0] || { name: 'Day Shift', startTime: '11:00 AM', endTime: '02:00 PM' };

        targetSubjects.forEach((sub: any, idx: number) => {
          const dayOffset = idx;
          const currentDayNum = d + dayOffset;
          const formattedDateBs = `${y}-${String(m).padStart(2, '0')}-${String(currentDayNum).padStart(2, '0')}`;
          const dName = dayNames[idx % dayNames.length];

          newSchedules.push({
            examDateBs: formattedDateBs,
            dayName: dName,
            classId: cid,
            subjectId: sub.id,
            shiftId: shiftObj.id || null,
            shiftName: shiftObj.name,
            startTime: shiftObj.startTime,
            endTime: shiftObj.endTime,
          });
        });
      }

      const res = await api.post(`/exams/${selectedExamId}/schedules`, {
        schedules: newSchedules,
        replaceAll: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Auto schedule generated successfully!');
      setIsAutoPlannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate schedule');
    },
  });

  // Filtered schedules
  const allSchedules = schedulesData || [];
  const filteredSchedules = allSchedules.filter((s: any) => {
    if (selectedShiftFilter !== 'ALL' && s.shiftName !== selectedShiftFilter && s.shift?.name !== selectedShiftFilter) {
      return false;
    }
    if (selectedClassFilter !== 'ALL' && s.classId.toString() !== selectedClassFilter) {
      return false;
    }
    return true;
  });

  // Group schedules by Date BS
  const schedulesByDate: Record<string, any[]> = {};
  filteredSchedules.forEach((item: any) => {
    const key = item.examDateBs;
    if (!schedulesByDate[key]) schedulesByDate[key] = [];
    schedulesByDate[key].push(item);
  });
  const sortedDates = Object.keys(schedulesByDate).sort();

  // Print Full School Routine Matrix
  const triggerSchoolMatrixPrint = () => {
    if (allSchedules.length === 0) {
      toast.error('No exam routine scheduled to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const examTitle = currentExam ? (currentExam.nameNepali || currentExam.name) : 'वार्षिक परीक्षा';
    const dates = Array.from(new Set(allSchedules.map((s: any) => s.examDateBs))).sort();
    const activeClasses = classesData || [];

    const dateHeaders = dates
      .map(
        (d) => `
        <th style="text-align: center; border: 1px solid #1e3a5f; background: #162c46; color: #fff; font-size: 9px; padding: 5px 3px;">
          ${d}
        </th>
      `
      )
      .join('');

    const rowsHtml = activeClasses
      .map((cls: any) => {
        const cells = dates
          .map((d) => {
            const entry = allSchedules.find((s: any) => s.classId === cls.id && s.examDateBs === d);
            if (!entry) return `<td style="text-align: center; border: 1px solid #cbd5e1; color: #94a3b8; font-size: 8.5px;">—</td>`;
            return `
              <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px 2px; font-size: 9px; background: #f8fafc;">
                <strong style="color: #1e3a5f; display: block;">${entry.subject?.name || 'Subject'}</strong>
                <span style="font-size: 7.5px; color: #64748b; font-family: monospace;">${entry.startTime || ''} - ${entry.endTime || ''}</span>
              </td>
            `;
          })
          .join('');

        return `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; background: #f1f5f9; font-size: 9.5px; white-space: nowrap;">
              ${cls.name} ${cls.section ? `(${cls.section})` : ''}
            </td>
            ${cells}
          </tr>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examTitle} — Official Exam Routine Matrix</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .report-title { font-size: 12px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 14px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 8px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 3px; font-size: 9px; }
            .shifts-legend { display: flex; gap: 12px; font-size: 10px; margin-bottom: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 160px; text-align: center; padding-top: 3px; margin-top: 35px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट (Shree Nepal Sec. School)</div>
            <div class="report-title">📋 ${examTitle} — परीक्षा समय तालिका तथा कार्यतालिका (Exam Routine Timetable)</div>
          </div>

          <div class="shifts-legend">
            ${
              examShiftsData?.map((s: any) => `<div><strong>☀️ ${s.name}:</strong> ${s.startTime} - ${s.endTime}</div>`).join('') ||
              '<div><strong>सिफ्ट:</strong> बिहानी तथा दिवा सत्र</div>'
            }
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 100px; text-align: left; padding-left: 6px;">कक्षा (Class)</th>
                ${dateHeaders}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-line">परीक्षा शाखा प्रमुख (Exam Incharge)</div>
            <div class="sig-line">परीक्षा नियन्त्रक (Exam Controller)</div>
            <div class="sig-line">प्रधानाध्यापकको दस्तखत तथा छाप</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Print Class-wise Routine Slip
  const triggerClassRoutinePrint = (targetClassId: number) => {
    const cls = classesData?.find((c: any) => c.id === targetClassId);
    if (!cls) return;

    const classRoutines = allSchedules
      .filter((s: any) => s.classId === targetClassId)
      .sort((a: any, b: any) => a.examDateBs.localeCompare(b.examDateBs));

    if (classRoutines.length === 0) {
      toast.error(`No routines found for ${cls.name}`);
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const examTitle = currentExam ? (currentExam.nameNepali || currentExam.name) : 'परीक्षा';

    const rowsHtml = classRoutines
      .map(
        (r: any, idx: number) => `
        <tr>
          <td style="text-align: center; border: 1px solid #1e3a5f; padding: 6px; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #1e3a5f; padding: 6px; font-family: monospace; font-weight: bold;">${r.examDateBs}</td>
          <td style="text-align: center; border: 1px solid #1e3a5f; padding: 6px; font-size: 11px;">${r.dayName || '—'}</td>
          <td style="border: 1px solid #1e3a5f; padding: 6px; font-weight: 800; font-size: 12px; color: #1e3a5f;">${r.subject?.name || '—'}</td>
          <td style="text-align: center; border: 1px solid #1e3a5f; padding: 6px; font-family: monospace; font-weight: bold;">${r.startTime} - ${r.endTime}</td>
          <td style="text-align: center; border: 1px solid #1e3a5f; padding: 6px; font-size: 10px; color: #6b21a8;">${r.shiftName || 'Day Shift'}</td>
          <td style="border: 1px solid #1e3a5f; padding: 6px; font-size: 10px; color: #64748b;">${r.remarks || ''}</td>
        </tr>
      `
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examTitle} Routine - ${cls.name}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .card { border: 3px double #1e3a5f; padding: 20px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 14px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; }
            .report-title { font-size: 13px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 4px 16px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 6px; }
            .meta-box { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; background: #f8fafc; padding: 8px 14px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #1e3a5f; color: #fff; padding: 8px; border: 1px solid #1e3a5f; font-size: 11px; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 170px; text-align: center; padding-top: 4px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 12px; font-weight: bold; color: #475569;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
              <div class="report-title">${examTitle} — परीक्षा तालिका (Exam Routine)</div>
            </div>

            <div class="meta-box">
              <div><strong>कक्षा (Class):</strong> ${cls.name} ${cls.section ? `(${cls.section})` : ''}</div>
              <div><strong>शैक्षिक सत्र:</strong> २०८३</div>
              <div><strong>कुल विषय:</strong> ${classRoutines.length}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">क्र.सं.</th>
                  <th style="width: 85px;">परीक्षा मिति</th>
                  <th style="width: 90px;">दिन (Day)</th>
                  <th>विषय (Subject)</th>
                  <th style="width: 120px;">समय (Timing)</th>
                  <th style="width: 85px;">सिफ्ट (Shift)</th>
                  <th style="width: 70px;">कैफियत</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="margin-top: 15px; font-size: 10.5px; color: #475569; font-style: italic;">
              📌 <b>निर्देशन:</b> विद्यार्थीहरूले परीक्षा सुरु हुनुभन्दा १५ मिनेट अगावै परीक्षा हलमा प्रवेश गरिसक्नुपर्नेछ। प्रवेश पत्र अनिवार्य साथमा ल्याउनुपर्नेछ।
            </div>

            <div class="footer-sig">
              <div class="sig-line">परीक्षा शाखा प्रमुख (Exam Incharge)</div>
              <div class="sig-line">परीक्षा नियन्त्रक (Exam Controller)</div>
              <div class="sig-line">प्रधानाध्यापकको दस्तखत तथा छाप</div>
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
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-[#1e3a5f] flex items-center gap-2">
              <Calendar className="text-[#1e3a5f]" size={20} />
              <span>Exam Schedule & Multi-Shift Routine (परीक्षा कार्यतालिका तथा सिफ्ट व्यवस्थापन)</span>
            </h2>
            <p className="text-xs text-gray-500 font-nepali mt-0.5">
              कुन दिन कुन विषयको परीक्षा कुन सिफ्ट र कुन कक्षालाई लिने भन्ने समय तालिका तथा कक्षागत रुटिन
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={triggerSchoolMatrixPrint}
              disabled={allSchedules.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Full Timetable (सम्पूर्ण तालिका छपाई)</span>
            </button>

            {isAdminOrIncharge && (
              <>
                <button
                  type="button"
                  onClick={() => setIsShiftsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                >
                  <Clock size={14} />
                  <span>Configure Shifts (सिफ्ट तथा समय)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAutoClassIds((classesData || []).map((c: any) => c.id));
                    setIsAutoPlannerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:from-amber-600 hover:to-amber-700 transition shadow-xs cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Auto-Fill Routine (स्वचालित तालिका)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (classesData?.length > 0) setEntryClassId(classesData[0].id.toString());
                    if (subjectsData?.length > 0) setEntrySubjectId(subjectsData[0].id.toString());
                    setIsAddEntryModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Routine Slot (नयाँ घण्टी थप्नुहोस्)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Exam & Shift Selection Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Exam Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Examination *:</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="erp-input font-bold text-[#1e3a5f]"
            >
              {examsData?.map((ex: any) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.nameNepali || 'नेपाली'})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Filter by Shift (सिफ्ट):</label>
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="erp-input font-medium"
            >
              <option value="ALL">All Shifts (सबै सिफ्टहरू)</option>
              {examShiftsData?.map((s: any) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Filter by Class (कक्षा):</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="erp-input font-medium"
            >
              <option value="ALL">All Classes (सबै कक्षाहरू)</option>
              {classesData?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-end">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-full text-center">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-[#1e3a5f] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Date Cards (मिति अनुसार)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  viewMode === 'matrix' ? 'bg-white text-[#1e3a5f] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Matrix Grid (म्याट्रिक्स)
              </button>
            </div>
          </div>
        </div>

        {/* Active Shifts Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-[11px] font-bold text-gray-500">Configured Shifts:</span>
          {examShiftsData?.length === 0 ? (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              ⚠️ No custom shifts configured yet (Default: Day Shift 11:00 AM - 02:00 PM)
            </span>
          ) : (
            examShiftsData?.map((shift: any) => {
              const ids = shift.classIds ? (typeof shift.classIds === 'string' ? JSON.parse(shift.classIds) : shift.classIds) : [];
              const classNames = classesData?.filter((c: any) => ids.includes(c.id)).map((c: any) => c.name).join(', ') || 'No classes assigned';

              return (
                <div
                  key={shift.id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-800"
                >
                  <span className="font-extrabold text-[#1e3a5f] flex items-center gap-1">
                    <Sun size={13} className="text-amber-500" />
                    <span>{shift.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-gray-600 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                    {shift.startTime} - {shift.endTime}
                  </span>
                  <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.2 rounded">
                    Classes: {classNames}
                  </span>
                  {onNavigateToSeatPlan && (
                    <button
                      type="button"
                      onClick={() => onNavigateToSeatPlan(selectedExamId, shift.name)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      🪑 Seat Plan →
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Routine Display: Date Cards View vs Matrix Grid */}
      {isSchedulesLoading ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
          <p className="mt-2 text-xs">Loading exam schedule...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
          <Calendar size={40} className="mx-auto text-gray-300" />
          <h3 className="text-base font-bold text-gray-800">No Exam Routine Configured</h3>
          <p className="text-xs text-gray-500 font-nepali max-w-md mx-auto">
            यस परीक्षाका लागि कुनै तालिका फेला परेन। माथिको "Auto-Fill Routine" वा "Add Routine Slot" थिची समय तालिका तयार गर्नुहोस्।
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ─── DATE-BY-DATE CARDS VIEW ─── */
        <div className="space-y-4">
          {sortedDates.map((dateBs) => {
            const routinesOnDate = schedulesByDate[dateBs];
            const dName = routinesOnDate[0]?.dayName || 'Day';

            return (
              <div
                key={dateBs}
                className="rounded-2xl border border-gray-200/90 bg-white shadow-xs overflow-hidden transition hover:border-blue-300"
              >
                {/* Date Header Strip */}
                <div className="bg-gradient-to-r from-slate-900 to-[#1e3a5f] text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-amber-300">📅 {dateBs}</span>
                    <span className="text-xs font-bold text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                      {dName}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    {routinesOnDate.length} {routinesOnDate.length === 1 ? 'Exam Slot' : 'Exam Slots'}
                  </span>
                </div>

                {/* Slots Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
                  {routinesOnDate.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-gray-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {r.class?.name} {r.class?.section ? `(${r.class?.section})` : ''}
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          {r.shiftName || 'Day Shift'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-gray-900 leading-snug">
                          {r.subject?.name}
                        </h4>
                        {r.subject?.nameNepali && (
                          <p className="text-[11px] text-gray-500 font-nepali">{r.subject?.nameNepali}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <span className="font-mono font-bold flex items-center gap-1">
                          <Clock size={12} className="text-amber-600" />
                          <span>{r.startTime || '11:00 AM'} - {r.endTime || '02:00 PM'}</span>
                        </span>
                        {r.roomNo && (
                          <span className="font-mono bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded text-[10px]">
                            Room {r.roomNo}
                          </span>
                        )}
                      </div>

                      {/* Delete Slot button */}
                      {isAdminOrIncharge && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${r.subject?.name} for ${r.class?.name} on ${r.examDateBs}?`)) {
                              deleteEntryMutation.mutate(r.id);
                            }
                          }}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                          title="Delete slot"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── FULL MATRIX TABLE VIEW ─── */
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto shadow-xs text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="p-3.5 font-bold border border-[#1e3a5f] sticky left-0 bg-[#1e3a5f] z-10">
                  कक्षा (Class)
                </th>
                {sortedDates.map((d) => (
                  <th key={d} className="p-3.5 font-bold border border-[#1e3a5f] text-center min-w-[130px]">
                    <div className="font-mono">{d}</div>
                    <div className="text-[10px] font-normal text-blue-200">
                      {schedulesByDate[d]?.[0]?.dayName || ''}
                    </div>
                  </th>
                ))}
                <th className="p-3.5 font-bold border border-[#1e3a5f] text-center">कार्य (Action)</th>
              </tr>
            </thead>
            <tbody>
              {classesData?.map((cls: any) => (
                <tr key={cls.id} className="hover:bg-slate-50/80 border-b border-gray-200">
                  <td className="p-3 font-bold text-gray-900 border-r border-gray-200 sticky left-0 bg-white">
                    {cls.name} {cls.section ? `(${cls.section})` : ''}
                  </td>
                  {sortedDates.map((d) => {
                    const entry = allSchedules.find((s: any) => s.classId === cls.id && s.examDateBs === d);
                    if (!entry) {
                      return <td key={d} className="p-2 text-center text-gray-300 border-r border-gray-200">—</td>;
                    }
                    return (
                      <td key={d} className="p-2 border-r border-gray-200 bg-blue-50/30 text-center">
                        <p className="font-extrabold text-blue-950 text-xs">{entry.subject?.name}</p>
                        <p className="text-[10px] font-mono text-gray-500">{entry.startTime} - {entry.endTime}</p>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => triggerClassRoutinePrint(cls.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>Print Slip</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── MODAL: CONFIGURE SHIFTS & TIMINGS ──────────────────────────────── */}
      {isShiftsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
                <Clock size={18} />
                <span>Configure Exam Shifts & Class Mappings (सिफ्ट तथा कक्षा व्यवस्थापन)</span>
              </h3>
              <button onClick={() => setIsShiftsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-nepali">
              एउटै परीक्षामा फरक-फरक समयमा सिफ्टहरू (जस्तै: बिहानी, दिवा सत्र) सिर्जना गर्नुहोस् र कुन सिफ्टमा कुन-कुन कक्षाले परीक्षा दिने हो छनौट गर्नुहोस्।
            </p>

            <div className="space-y-4">
              {shiftsList.map((shift, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-2xl border border-gray-200 bg-slate-50/60 p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-[#1e3a5f] bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                      Shift #{sIdx + 1}
                    </span>
                    {shiftsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShiftsList(shiftsList.filter((_, i) => i !== sIdx))}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Remove Shift</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Shift Name (सिफ्टको नाम) *</label>
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => {
                          const updated = [...shiftsList];
                          updated[sIdx].name = e.target.value;
                          setShiftsList(updated);
                        }}
                        className="erp-input font-bold"
                        placeholder="e.g. Morning Shift"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Nepali Name (नेपाली नाम)</label>
                      <input
                        type="text"
                        value={shift.nameNepali || ''}
                        onChange={(e) => {
                          const updated = [...shiftsList];
                          updated[sIdx].nameNepali = e.target.value;
                          setShiftsList(updated);
                        }}
                        className="erp-input font-nepali"
                        placeholder="जस्तै: बिहानी सिफ्ट"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Start Time (सुरु समय) *</label>
                      <input
                        type="text"
                        value={shift.startTime}
                        onChange={(e) => {
                          const updated = [...shiftsList];
                          updated[sIdx].startTime = e.target.value;
                          setShiftsList(updated);
                        }}
                        className="erp-input font-mono font-bold"
                        placeholder="07:00 AM"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">End Time (अन्त्य समय) *</label>
                      <input
                        type="text"
                        value={shift.endTime}
                        onChange={(e) => {
                          const updated = [...shiftsList];
                          updated[sIdx].endTime = e.target.value;
                          setShiftsList(updated);
                        }}
                        className="erp-input font-mono font-bold"
                        placeholder="10:00 AM"
                      />
                    </div>
                  </div>

                  {/* Classes Assigned to this Shift */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-200/80">
                    <label className="block font-bold text-gray-700">
                      Assigned Classes for this Shift (यस सिफ्टमा परीक्षा दिने कक्षाहरू):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {classesData?.map((cls: any) => {
                        const isChecked = shift.classIds.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              const updated = [...shiftsList];
                              if (isChecked) {
                                updated[sIdx].classIds = updated[sIdx].classIds.filter((id) => id !== cls.id);
                              } else {
                                updated[sIdx].classIds = [...updated[sIdx].classIds, cls.id];
                              }
                              setShiftsList(updated);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isChecked
                                ? 'bg-purple-100 border-purple-600 text-purple-900 ring-1 ring-purple-600'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                            }`}
                          >
                            {cls.name} {cls.section ? `(${cls.section})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setShiftsList([
                    ...shiftsList,
                    {
                      name: `Shift ${shiftsList.length + 1}`,
                      nameNepali: '',
                      startTime: '01:00 PM',
                      endTime: '04:00 PM',
                      classIds: [],
                    },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-purple-300 text-purple-700 font-bold hover:bg-purple-50 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Another Shift (थप नयाँ सिफ्ट थप्नुहोस्)</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsShiftsModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveShiftsMutation.isPending}
                onClick={() => saveShiftsMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
              >
                {saveShiftsMutation.isPending ? 'Saving...' : 'Save Shifts Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD SINGLE ROUTINE ENTRY ─────────────────────────────────── */}
      {isAddEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
                <Calendar size={18} />
                <span>Add Routine Slot (परीक्षा तालिका थप्नुहोस्)</span>
              </h3>
              <button onClick={() => setIsAddEntryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Date (मिति BS) *</label>
                  <input
                    type="text"
                    required
                    value={entryDateBs}
                    onChange={(e) => setEntryDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                    placeholder="2083-05-15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Day Name (बार)</label>
                  <select
                    value={entryDayName}
                    onChange={(e) => setEntryDayName(e.target.value)}
                    className="erp-input"
                  >
                    <option value="आइतबार (Sunday)">आइतबार (Sunday)</option>
                    <option value="सोमबार (Monday)">सोमबार (Monday)</option>
                    <option value="मंगलबार (Tuesday)">मंगलबार (Tuesday)</option>
                    <option value="बुधबार (Wednesday)">बुधबार (Wednesday)</option>
                    <option value="बिहीबार (Thursday)">बिहीबार (Thursday)</option>
                    <option value="शुक्रबार (Friday)">शुक्रबार (Friday)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Class (कक्षा) *</label>
                <select
                  value={entryClassId}
                  onChange={(e) => setEntryClassId(e.target.value)}
                  className="erp-input font-bold"
                >
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject (विषय) *</label>
                <select
                  value={entrySubjectId}
                  onChange={(e) => setEntrySubjectId(e.target.value)}
                  className="erp-input font-bold text-[#1e3a5f]"
                >
                  {subjectsData?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nameNepali ? `(${s.nameNepali})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Shift (सिफ्ट)</label>
                <select
                  value={entryShiftName}
                  onChange={(e) => {
                    setEntryShiftName(e.target.value);
                    const sObj = examShiftsData?.find((s: any) => s.name === e.target.value);
                    if (sObj) {
                      setEntryShiftId(sObj.id.toString());
                      setEntryStartTime(sObj.startTime);
                      setEntryEndTime(sObj.endTime);
                    }
                  }}
                  className="erp-input font-medium"
                >
                  {examShiftsData?.map((s: any) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={entryStartTime}
                    onChange={(e) => setEntryStartTime(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={entryEndTime}
                    onChange={(e) => setEntryEndTime(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddEntryModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveEntryMutation.isPending || !entryClassId || !entrySubjectId}
                onClick={() => saveEntryMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
              >
                {saveEntryMutation.isPending ? 'Saving...' : 'Save Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: AUTO-FILL ROUTINE PLANNER ───────────────────────────────── */}
      {isAutoPlannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} />
                <span>Auto-Generate Exam Routine (स्वचालित तालिका निर्माण)</span>
              </h3>
              <button onClick={() => setIsAutoPlannerOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-nepali">
              प्रणालीले प्रत्येक कक्षाका पाठ्यक्रम अनुसारका विषयहरूलाई तोकिएको सुरु मितिबाट लगातार दिनहरूमा स्वचालित रूपमा मिलाउनेछ।
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Exam Start Date (परीक्षा सुरु हुने मिति BS) *</label>
                <input
                  type="text"
                  required
                  value={autoStartDateBs}
                  onChange={(e) => setAutoStartDateBs(e.target.value)}
                  className="erp-input font-mono font-bold"
                  placeholder="2083-05-15"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-700">Select Classes to Schedule:</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (autoClassIds.length === classesData?.length) {
                        setAutoClassIds([]);
                      } else {
                        setAutoClassIds((classesData || []).map((c: any) => c.id));
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {autoClassIds.length === classesData?.length ? 'Deselect All' : 'Select All Classes'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classesData?.map((cls: any) => {
                    const isChecked = autoClassIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setAutoClassIds(autoClassIds.filter((id) => id !== cls.id));
                          } else {
                            setAutoClassIds([...autoClassIds, cls.id]);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 border-[#1e3a5f] text-[#1e3a5f] ring-1 ring-[#1e3a5f]'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                        }`}
                      >
                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAutoPlannerOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={autoPlannerMutation.isPending || autoClassIds.length === 0}
                onClick={() => autoPlannerMutation.mutate()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 font-bold text-white hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 cursor-pointer"
              >
                {autoPlannerMutation.isPending ? 'Generating Matrix...' : 'Generate Full Timetable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
