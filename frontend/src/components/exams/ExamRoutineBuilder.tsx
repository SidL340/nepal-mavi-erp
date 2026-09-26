'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  Save,
  RotateCcw,
  CheckSquare,
  BadgeCheck,
  ChevronRight,
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

export default function ExamRoutineBuilder({
  initialExamId,
  exams: initialExams,
  classes: initialClasses,
  onNavigateToSeatPlan,
}: ExamRoutineBuilderProps) {
  const { user } = useAuthStore();
  const isAdminOrIncharge =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    ((user?.teacher as any)?.inchargeRole || '').toUpperCase().includes('EXAM');

  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId ? String(initialExamId) : ''
  );
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'matrix_builder' | 'cards' | 'grid'>('matrix_builder');

  // Bulk Matrix State
  const [matrixDates, setMatrixDates] = useState<string[]>([]);
  // matrixGrid: { [classId]: { [dateBs]: { subjectId: number | null, shiftName: string, startTime: string, endTime: string, roomNo?: string } } }
  const [matrixGrid, setMatrixGrid] = useState<Record<number, Record<string, any>>>({});

  // Auto Date Range Generator in Matrix
  const [generatorStartDateBs, setGeneratorStartDateBs] = useState(todayBS());
  const [generatorDaysCount, setGeneratorDaysCount] = useState(7);
  const [generatorSkipSaturday, setGeneratorSkipSaturday] = useState(true);

  // Edit Single Routine Entry Modal
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDateBs, setEditDateBs] = useState('');
  const [editDayName, setEditDayName] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editShiftName, setEditShiftName] = useState('DAY');
  const [editStartTime, setEditStartTime] = useState('11:00 AM');
  const [editEndTime, setEditEndTime] = useState('02:00 PM');
  const [editRoomNo, setEditRoomNo] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Add Single Routine Entry Modal
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [entryDateBs, setEntryDateBs] = useState(todayBS());
  const [entryDayName, setEntryDayName] = useState('आइतबार (Sunday)');
  const [entryClassId, setEntryClassId] = useState<string>('');
  const [entrySubjectId, setEntrySubjectId] = useState<string>('');
  const [entryShiftName, setEntryShiftName] = useState<string>('DAY');
  const [entryStartTime, setEntryStartTime] = useState('11:00 AM');
  const [entryEndTime, setEntryEndTime] = useState('02:00 PM');
  const [entryRoomNo, setEntryRoomNo] = useState('');
  const [entryRemarks, setEntryRemarks] = useState('');

  // Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Fetch Classes with their assigned Subjects
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const classesList: any[] = classesData || [];

  // Set default exam
  useEffect(() => {
    if (examsData?.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].id.toString());
    }
  }, [examsData, selectedExamId]);

  const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);

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

  const schedules: any[] = schedulesData || [];

  // Available shifts for selected exam
  const examShifts = currentExam?.shifts || [];
  const availableShifts = useMemo(() => {
    const list = [
      { name: 'MORNING', nameNepali: 'बिहानी सत्र (Morning Shift)', startTime: '07:00 AM', endTime: '10:00 AM' },
      { name: 'DAY', nameNepali: 'दिवा सत्र (Day Shift)', startTime: '11:00 AM', endTime: '02:00 PM' },
      { name: 'EVENING', nameNepali: 'साँझ सत्र (Evening Shift)', startTime: '03:00 PM', endTime: '06:00 PM' },
    ];
    if (examShifts.length > 0) {
      examShifts.forEach((s: any) => {
        const idx = list.findIndex((x) => x.name === s.name);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            nameNepali: s.nameNepali || list[idx].nameNepali,
            startTime: s.startTime || list[idx].startTime,
            endTime: s.endTime || list[idx].endTime,
          };
        } else {
          list.push({
            name: s.name,
            nameNepali: s.nameNepali || s.name,
            startTime: s.startTime || '07:00 AM',
            endTime: s.endTime || '10:00 AM',
          });
        }
      });
    }
    return list;
  }, [examShifts]);

  // Helper to get day name in Nepali from date offset
  const getDayNameNepali = (idx: number) => {
    const days = ['आइतबार (Sun)', 'सोमबार (Mon)', 'मंगलबार (Tue)', 'बुधबार (Wed)', 'बिहीबार (Thu)', 'शुक्रबार (Fri)', 'शनिबार (Sat)'];
    return days[idx % 7];
  };

  // Helper to generate next BS date string
  const addDaysToBS = (baseDateBs: string, daysToAdd: number): string => {
    try {
      const parts = baseDateBs.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        let y = parts[0];
        let m = parts[1];
        let d = parts[2] + daysToAdd;
        if (d > 30) {
          m += Math.floor((d - 1) / 30);
          d = ((d - 1) % 30) + 1;
        }
        if (m > 12) {
          y += Math.floor((m - 1) / 12);
          m = ((m - 1) % 12) + 1;
        }
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    } catch {}
    return baseDateBs;
  };

  // Populate Matrix from existing schedules or initialize
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      const uniqueDates = Array.from(new Set(schedules.map((s) => s.examDateBs))).sort();
      setMatrixDates(uniqueDates);

      const grid: Record<number, Record<string, any>> = {};
      schedules.forEach((sc) => {
        if (!grid[sc.classId]) grid[sc.classId] = {};
        grid[sc.classId][sc.examDateBs] = {
          scheduleId: sc.id,
          subjectId: sc.subjectId,
          shiftName: sc.shiftName || sc.shift?.name || 'DAY',
          startTime: sc.startTime || '11:00 AM',
          endTime: sc.endTime || '02:00 PM',
          roomNo: sc.roomNo || '',
        };
      });
      setMatrixGrid(grid);
    } else if (matrixDates.length === 0) {
      // Default 6 consecutive exam dates starting today
      const defaultDates: string[] = [];
      let count = 0;
      let offset = 0;
      while (count < 6 && offset < 14) {
        const d = addDaysToBS(todayBS(), offset);
        defaultDates.push(d);
        count++;
        offset++;
      }
      setMatrixDates(defaultDates);
    }
  }, [schedules]);

  // Generate Date Range function for matrix
  const handleGenerateDateSequence = () => {
    const dates: string[] = [];
    let count = 0;
    let offset = 0;
    while (count < generatorDaysCount && offset < 30) {
      const d = addDaysToBS(generatorStartDateBs, offset);
      dates.push(d);
      count++;
      offset++;
    }
    setMatrixDates(dates);
    toast.success(`Generated ${dates.length} exam dates in sequence.`);
  };

  // Add single date column
  const handleAddDateColumn = () => {
    const lastDate = matrixDates.length > 0 ? matrixDates[matrixDates.length - 1] : todayBS();
    const nextDate = addDaysToBS(lastDate, 1);
    if (!matrixDates.includes(nextDate)) {
      setMatrixDates([...matrixDates, nextDate]);
      toast.success(`Added Date: ${nextDate}`);
    } else {
      const extraDate = addDaysToBS(lastDate, 2);
      setMatrixDates([...matrixDates, extraDate]);
    }
  };

  // Remove a date column
  const handleRemoveDateColumn = (dateToRemove: string) => {
    setMatrixDates(matrixDates.filter((d) => d !== dateToRemove));
  };

  // Update Matrix Cell Subject
  const handleCellSubjectChange = (classId: number, dateBs: string, subjectId: number | null) => {
    setMatrixGrid((prev) => {
      const classMap = prev[classId] || {};
      const currentCell = classMap[dateBs] || {};

      // Match class shift if available
      const matchedShift = examShifts.find((s: any) => {
        const cids = s.classIds ? (typeof s.classIds === 'string' ? JSON.parse(s.classIds) : s.classIds) : [];
        return cids.includes(classId);
      }) || availableShifts[1]; // default day

      return {
        ...prev,
        [classId]: {
          ...classMap,
          [dateBs]: {
            ...currentCell,
            subjectId,
            shiftName: currentCell.shiftName || matchedShift?.name || 'DAY',
            startTime: currentCell.startTime || matchedShift?.startTime || '11:00 AM',
            endTime: currentCell.endTime || matchedShift?.endTime || '02:00 PM',
          },
        },
      };
    });
  };

  // Save Entire Matrix Mutation
  const saveMatrixMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) throw new Error('Please select an Examination.');

      const newSchedules: any[] = [];

      Object.entries(matrixGrid).forEach(([cIdStr, dateMap]) => {
        const classId = parseInt(cIdStr);
        Object.entries(dateMap).forEach(([dateBs, cellData]: [string, any]) => {
          if (cellData && cellData.subjectId) {
            newSchedules.push({
              examDateBs: dateBs,
              dayName: getDayNameNepali(newSchedules.length),
              classId,
              subjectId: parseInt(cellData.subjectId),
              shiftName: cellData.shiftName || 'DAY',
              startTime: cellData.startTime || '11:00 AM',
              endTime: cellData.endTime || '02:00 PM',
              roomNo: cellData.roomNo || null,
            });
          }
        });
      });

      if (newSchedules.length === 0) {
        throw new Error('Please select at least one subject in the schedule table before saving.');
      }

      const res = await api.post(`/exams/${selectedExamId}/schedules`, {
        schedules: newSchedules,
        replaceAll: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Full exam schedule saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save exam schedule');
    },
  });

  // Edit Single Routine Entry Mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!editingSchedule) return;
      if (!editSubjectId || !editDateBs) throw new Error('Subject and Date are required.');

      const res = await api.put(`/exams/${selectedExamId}/schedules/${editingSchedule.id}`, {
        examDateBs: editDateBs,
        dayName: editDayName,
        subjectId: parseInt(editSubjectId),
        shiftName: editShiftName,
        startTime: editStartTime,
        endTime: editEndTime,
        roomNo: editRoomNo || null,
        remarks: editRemarks || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Exam routine updated!');
      setIsEditModalOpen(false);
      setEditingSchedule(null);
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update schedule');
    },
  });

  const openEditModal = (sch: any) => {
    setEditingSchedule(sch);
    setEditDateBs(sch.examDateBs || todayBS());
    setEditDayName(sch.dayName || '');
    setEditSubjectId(String(sch.subjectId || ''));
    setEditShiftName(sch.shiftName || 'DAY');
    setEditStartTime(sch.startTime || '11:00 AM');
    setEditEndTime(sch.endTime || '02:00 PM');
    setEditRoomNo(sch.roomNo || '');
    setEditRemarks(sch.remarks || '');
    setIsEditModalOpen(true);
  };

  // Delete Single Schedule Entry Mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/exams/${selectedExamId}/schedules/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Schedule entry removed.');
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    },
  });

  // Filtered schedules for Cards View
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s: any) => {
      if (selectedShiftFilter !== 'ALL' && s.shiftName !== selectedShiftFilter) {
        return false;
      }
      if (selectedClassFilter !== 'ALL' && s.classId.toString() !== selectedClassFilter) {
        return false;
      }
      return true;
    });
  }, [schedules, selectedShiftFilter, selectedClassFilter]);

  // Group schedules by Date BS
  const schedulesByDate: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredSchedules.forEach((item: any) => {
      const key = item.examDateBs;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [filteredSchedules]);

  const sortedDates = Object.keys(schedulesByDate).sort();

  // Print Routine Timetable Notice
  const printExamRoutineNotice = () => {
    if (schedules.length === 0) {
      toast.error('No exam routine scheduled to print.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? `${currentExam.name} (${currentExam.nameNepali || ''})` : 'Examination';
    const dates = Array.from(new Set(schedules.map((s) => s.examDateBs))).sort();

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Routine - ${examTitle}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: sans-serif; font-size: 10.5px; margin: 0; padding: 0; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
          .school-name { font-size: 16px; font-weight: bold; color: #1e3a5f; }
          .exam-title { font-size: 13px; font-weight: bold; margin-top: 2px; }
          .legend-bar { display: flex; gap: 15px; margin-bottom: 8px; font-size: 10px; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9.5px; }
          th, td { border: 1px solid #94a3b8; padding: 5px 4px; text-align: center; }
          th { background: #1e3a5f; color: white; font-weight: bold; }
          .class-col { background: #f8fafc; font-weight: bold; text-align: left; padding-left: 8px; font-size: 10.5px; }
          .subject-name { font-weight: bold; color: #1e3a5f; font-size: 10px; }
          .timing { font-size: 8px; color: #64748b; font-family: monospace; display: block; margin-top: 1px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; font-size: 10.5px; font-weight: bold; }
          .sig-box { text-align: center; border-top: 1px dashed #333; width: 160px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">श्री नेपाल माध्यमिक विद्यालय (NEPAL SECONDARY SCHOOL)</div>
          <div class="exam-title">परीक्षा समय तालिका तथा कार्यतालिका (EXAM ROUTINE & TIMETABLE) — ${examTitle}</div>
        </div>

        <div class="legend-bar">
          ${availableShifts.map((s) => `<div><strong>${s.nameNepali}:</strong> ${s.startTime} - ${s.endTime}</div>`).join('')}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 100px; text-align: left; padding-left: 8px;">कक्षा (Class)</th>
              ${dates.map((d) => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${classesList
              .map((cls) => {
                const cells = dates
                  .map((d) => {
                    const entry = schedules.find((s) => s.classId === cls.id && s.examDateBs === d);
                    if (!entry) return `<td style="color:#cbd5e1;">—</td>`;
                    return `
                      <td>
                        <div class="subject-name">${entry.subject?.name || 'Subject'}</div>
                        <span class="timing">${entry.startTime || ''} - ${entry.endTime || ''}</span>
                      </td>
                    `;
                  })
                  .join('');

                return `
                  <tr>
                    <td class="class-col">${cls.name}</td>
                    ${cells}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">परीक्षा शाखा (Exam Department)</div>
          <div class="sig-box">परीक्षा संयोजक (Exam In-charge)</div>
          <div class="sig-box">प्रधानाध्यापक (Headmaster)</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-5">
      {/* ─── TOP CONTROL & VIEW TOGGLE BAR ─────────────────────────────────── */}
      <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              <span>Exam Routine & Schedule Builder (परीक्षा समय तालिका निर्माण)</span>
            </h2>
            <p className="text-xs text-gray-500 font-nepali mt-0.5">
              कक्षा अनुसार तालिका ढाँचामा एकैपटक सम्पूर्ण परीक्षा तालिका निर्माण र प्रत्येक मिति तथा विषय सम्पादन गर्नुहोस्
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={printExamRoutineNotice}
              disabled={schedules.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
            >
              <Printer size={14} className="text-blue-600" />
              <span>Print Timetable (रुटिन प्रिन्ट)</span>
            </button>

            {viewMode === 'matrix_builder' && (
              <button
                type="button"
                onClick={() => saveMatrixMutation.mutate()}
                disabled={saveMatrixMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saveMatrixMutation.isPending ? 'Saving...' : 'Save Entire Routine (एकमुष्ट सेभ)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('matrix_builder')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'matrix_builder'
                  ? 'bg-[#1e3a5f] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table size={14} />
              <span>Bulk Table Matrix (एकमुष्ट तालिका)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#1e3a5f] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Routine Cards (दैनिक कार्डहरू)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-bold">Exam:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="erp-input font-bold text-[#1e3a5f] py-1 px-2.5 text-xs max-w-xs"
            >
              {examsData?.map((ex: any) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.nameNepali || 'नेपाली'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── VIEW 1: BULK SCHEDULE TABLE MATRIX BUILDER ───────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'matrix_builder' && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          {/* Quick Date Sequence Generator Bar */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-200/60 pb-2">
              <span className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5">
                <Sparkles size={15} className="text-purple-700" />
                <span>Quick Date Sequence Generator (परीक्षा मिति शृङ्खला)</span>
              </span>
              <span className="text-[10.5px] text-gray-500 font-nepali">
                सुरु मिति तोक्नुहोस् र तालिकामा नयाँ मिति स्तम्भहरू थप्नुहोस्
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Start Date (BS)</label>
                <input
                  type="text"
                  value={generatorStartDateBs}
                  onChange={(e) => setGeneratorStartDateBs(e.target.value)}
                  className="erp-input font-mono font-bold"
                  placeholder="2083-05-15"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Number of Days</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={generatorDaysCount}
                  onChange={(e) => setGeneratorDaysCount(parseInt(e.target.value) || 6)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleGenerateDateSequence}
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2 text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Generate Date Columns</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddDateColumn}
                  className="rounded-xl border border-purple-300 bg-white hover:bg-purple-50 text-purple-900 font-bold px-3.5 py-2 text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>Add 1 Date (+१ दिन)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Matrix Grid Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e3a5f] text-white font-bold text-[11px]">
                  <th className="py-3 px-4 sticky left-0 z-20 bg-[#1e3a5f] min-w-[140px] border-r border-blue-900">
                    कक्षा (Class)
                  </th>
                  {matrixDates.map((dateBs, dIdx) => (
                    <th key={dateBs} className="py-2.5 px-3 min-w-[190px] text-center border-r border-blue-900">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs">{dateBs}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDateColumn(dateBs)}
                          title="Remove Date Column"
                          className="text-red-300 hover:text-white transition p-0.5 rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <span className="text-[10px] text-blue-200 block font-normal">
                        Day #{dIdx + 1} &bull; {getDayNameNepali(dIdx)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classesList.map((cls) => {
                  // Get subjects strictly assigned to this class
                  const classSubjects = (cls.subjects || []).map((cs: any) => cs.subject).filter(Boolean);

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50 transition">
                      {/* Class Label Column (Sticky Left) */}
                      <td className="py-3 px-4 font-black text-gray-900 sticky left-0 z-10 bg-white border-r border-gray-200 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-6 w-6 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-[10.5px]">
                            {cls.name.replace(/\D/g, '') || cls.name.charAt(0)}
                          </span>
                          <span className="truncate">{cls.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block font-normal">
                          {classSubjects.length} subjects available
                        </span>
                      </td>

                      {/* Subject Cells per Date */}
                      {matrixDates.map((dateBs) => {
                        const cellData = matrixGrid[cls.id]?.[dateBs] || {};
                        const selectedSubId = cellData.subjectId || '';

                        return (
                          <td key={dateBs} className="p-2 border-r border-gray-100 align-top">
                            <select
                              value={selectedSubId}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                handleCellSubjectChange(cls.id, dateBs, val);
                              }}
                              className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                                selectedSubId
                                  ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-black ring-1 ring-blue-300'
                                  : 'bg-white border-gray-200 text-gray-500 hover:bg-slate-50'
                              }`}
                            >
                              <option value="">-- No Exam / Holiday --</option>
                              {classSubjects.map((sub: any) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} {sub.nameNepali ? `(${sub.nameNepali})` : ''}
                                </option>
                              ))}
                            </select>

                            {selectedSubId && (
                              <div className="mt-1 flex items-center justify-between text-[9.5px] font-mono text-gray-400 px-1">
                                <span>{cellData.startTime || '11:00 AM'} - {cellData.endTime || '02:00 PM'}</span>
                                <span className="text-purple-700 font-bold">{cellData.shiftName || 'DAY'}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Save Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 font-nepali">
              💡 प्रत्येक कक्षाको ड्रपडाउनमा त्यस कक्षामा पढाइ हुने विषयहरू मात्र देखिन्छन्। रुटिन मिलाएपछि &quot;Save Entire Routine&quot; थिच्नुहोस्।
            </p>

            <button
              type="button"
              onClick={() => saveMatrixMutation.mutate()}
              disabled={saveMatrixMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              <span>{saveMatrixMutation.isPending ? 'Saving...' : 'Save Entire Routine (एकमुष्ट सेभ)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── VIEW 2: ROUTINE CARDS & DETAILED EDIT VIEW ───────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-700 flex items-center gap-1">
                <Filter size={13} /> Filter Shift:
              </span>
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                className="erp-input py-1 px-2.5 font-bold text-xs"
              >
                <option value="ALL">All Shifts (सबै सिफ्ट)</option>
                {availableShifts.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.nameNepali}
                  </option>
                ))}
              </select>

              <span className="font-bold text-gray-700 ml-2">Class:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="erp-input py-1 px-2.5 font-bold text-xs"
              >
                <option value="ALL">All Classes (सबै कक्षा)</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-700">
              Total Routines: <span className="font-mono text-blue-700">{filteredSchedules.length}</span>
            </div>
          </div>

          {/* Cards List Grouped by Date */}
          {sortedDates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-2">
              <Calendar className="mx-auto text-gray-300" size={36} />
              <h3 className="text-sm font-bold text-gray-700">No Exam Routine Found</h3>
              <p className="text-xs text-gray-400">
                Switch to &quot;Bulk Table Matrix&quot; above to easily create the full exam schedule for all classes.
              </p>
            </div>
          ) : (
            sortedDates.map((dateBs, dIdx) => {
              const entries = schedulesByDate[dateBs] || [];
              return (
                <div key={dateBs} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center font-mono">
                        {dIdx + 1}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-gray-900 font-mono">{dateBs}</h4>
                        <p className="text-[11px] text-gray-500">{entries[0]?.dayName || getDayNameNepali(dIdx)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {entries.length} Classes Examined
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {entries.map((item: any) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-200 bg-slate-50/50 p-3.5 space-y-2 hover:border-blue-400 hover:bg-blue-50/30 transition text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-lg text-[10.5px]">
                            {item.class?.name || 'Class'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Routine"
                              className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-white transition cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this routine entry?')) {
                                  deleteScheduleMutation.mutate(item.id);
                                }
                              }}
                              title="Delete Routine"
                              className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-white transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="font-extrabold text-gray-900 text-sm">{item.subject?.name}</p>
                          <p className="text-[10px] text-gray-500 font-nepali">{item.subject?.nameNepali || ''}</p>
                        </div>

                        <div className="pt-1 border-t border-slate-200/50 flex items-center justify-between font-mono text-[10.5px] text-gray-600">
                          <span>⏰ {item.startTime} - {item.endTime}</span>
                          <span className="font-bold text-purple-700">{item.shiftName || 'DAY'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── EDIT SINGLE ROUTINE MODAL ──────────────────────────────────────── */}
      {isEditModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Edit2 className="text-blue-600" size={18} />
                <h3 className="text-sm font-bold text-gray-900">
                  Edit Routine Entry ({editingSchedule.class?.name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSchedule(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateScheduleMutation.mutate();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject (विषय) *</label>
                <select
                  required
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="">-- Choose Subject --</option>
                  {(
                    classesList
                      .find((c) => c.id === editingSchedule.classId)
                      ?.subjects?.map((cs: any) => cs.subject)
                      .filter(Boolean) || []
                  ).map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.nameNepali ? `(${sub.nameNepali})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Date (BS) *</label>
                  <input
                    type="text"
                    required
                    value={editDateBs}
                    onChange={(e) => setEditDateBs(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Day Name</label>
                  <input
                    type="text"
                    value={editDayName}
                    onChange={(e) => setEditDayName(e.target.value)}
                    placeholder="e.g. आइतबार (Sun)"
                    className="erp-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Exam Shift (सत्र)</label>
                <select
                  value={editShiftName}
                  onChange={(e) => setEditShiftName(e.target.value)}
                  className="erp-input font-bold"
                >
                  {availableShifts.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.nameNepali}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="erp-input font-mono font-bold"
                    placeholder="11:00 AM"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="erp-input font-mono font-bold"
                    placeholder="02:00 PM"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks (कैफियत)</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSchedule(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateScheduleMutation.isPending}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updateScheduleMutation.isPending ? 'Updating...' : 'Update Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
