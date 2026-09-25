'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Clock,
  Save,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  School,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Users,
  Copy,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'SUNDAY', name: 'Sunday (आइतबार)' },
  { key: 'MONDAY', name: 'Monday (सोमबार)' },
  { key: 'TUESDAY', name: 'Tuesday (मंगलबार)' },
  { key: 'WEDNESDAY', name: 'Wednesday (बुधबार)' },
  { key: 'THURSDAY', name: 'Thursday (बिहीबार)' },
  { key: 'FRIDAY', name: 'Friday (शुक्रबार)' },
];

const PERIODS = [
  { num: 1, time: '10:15 - 11:00 AM' },
  { num: 2, time: '11:00 - 11:45 AM' },
  { num: 3, time: '11:45 - 12:30 PM' },
  { num: 4, time: '12:30 - 01:15 PM' },
  { num: 5, time: '01:45 - 02:25 PM' }, // After Tiffin
  { num: 6, time: '02:25 - 03:05 PM' },
  { num: 7, time: '03:05 - 03:45 PM' },
  { num: 8, time: '03:45 - 04:15 PM' },
];

export default function ClassRoutinePage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState('SUNDAY');
  const [copyTargetDay, setCopyTargetDay] = useState('ALL');

  // Routine Matrix state: [periodNumber] -> { subjectId, teacherId, roomNo }
  const [routineGrid, setRoutineGrid] = useState<Record<string, { subjectId: string; teacherId: string; roomNo: string }>>({});

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Teachers
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
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

  // Auto-select first class
  useEffect(() => {
    if (classesData && classesData.length > 0 && !selectedClassId) {
      setSelectedClassId(classesData[0].id.toString());
    }
  }, [classesData, selectedClassId]);

  // Fetch Routine for selected class
  const { data: routineData, isLoading: isRoutineLoading } = useQuery({
    queryKey: ['class-routine', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await api.get(`/routine/class/${selectedClassId}`);
      return res.data?.data || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch Master Routine for conflict checking
  const { data: allRoutinesData } = useQuery({
    queryKey: ['all-routines'],
    queryFn: async () => {
      const res = await api.get('/routine/master');
      return res.data?.data || [];
    },
  });

  // Populate routineGrid when routineData changes
  useEffect(() => {
    if (routineData) {
      const grid: Record<string, { subjectId: string; teacherId: string; roomNo: string }> = {};
      routineData.forEach((item: any) => {
        const key = `${item.dayOfWeek}_${item.periodNumber}`;
        grid[key] = {
          subjectId: item.subjectId ? item.subjectId.toString() : '',
          teacherId: item.teacherId ? item.teacherId.toString() : '',
          roomNo: item.roomNo || '',
        };
      });
      setRoutineGrid(grid);
    }
  }, [routineData]);

  const selectedClassObj = classesData?.find((c: any) => c.id.toString() === selectedClassId);

  // Filter subjects strictly to those assigned to this specific class
  const classSubjects = (selectedClassObj?.subjects && selectedClassObj.subjects.length > 0)
    ? selectedClassObj.subjects.map((cs: any) => cs.subject || subjectsData?.find((s: any) => s.id === cs.subjectId)).filter(Boolean)
    : subjectsData || [];

  // Check teacher conflict across other classes
  const checkConflict = (day: string, period: number, teacherIdStr: string) => {
    if (!teacherIdStr || !allRoutinesData) return null;
    const tid = parseInt(teacherIdStr);
    const conflict = allRoutinesData.find(
      (r: any) =>
        r.dayOfWeek === day &&
        r.periodNumber === period &&
        r.teacherId === tid &&
        r.classId.toString() !== selectedClassId
    );
    return conflict ? conflict.class?.name || 'Another Class' : null;
  };

  // Copy routine from selectedDay to other days
  const handleCopyRoutine = () => {
    setRoutineGrid((prev) => {
      const next = { ...prev };
      const targetDays = copyTargetDay === 'ALL'
        ? DAYS.map((d) => d.key).filter((k) => k !== selectedDay)
        : [copyTargetDay];

      targetDays.forEach((targetKey) => {
        PERIODS.forEach((p) => {
          const sourceKey = `${selectedDay}_${p.num}`;
          const destKey = `${targetKey}_${p.num}`;
          if (next[sourceKey]) {
            next[destKey] = { ...next[sourceKey] };
          }
        });
      });
      return next;
    });

    const srcName = DAYS.find((d) => d.key === selectedDay)?.name?.split(' ')[0] || selectedDay;
    const targetName = copyTargetDay === 'ALL' ? 'सबै दिनहरू (All Days)' : DAYS.find((d) => d.key === copyTargetDay)?.name?.split(' ')[0];
    toast.success(`${srcName} को तालिका ${targetName} मा सफलतापूर्वक प्रतिलिपि (Copied) गरियो!`);
  };

  // Batch Save Routine Mutation
  const saveRoutineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) throw new Error('Please select a class');
      const entries: any[] = [];

      DAYS.forEach((d) => {
        PERIODS.forEach((p) => {
          const key = `${d.key}_${p.num}`;
          const cell = routineGrid[key];
          if (cell && (cell.subjectId || cell.teacherId)) {
            entries.push({
              classId: parseInt(selectedClassId),
              dayOfWeek: d.key,
              periodNumber: p.num,
              startTime: p.time.split(' - ')[0],
              endTime: p.time.split(' - ')[1],
              subjectId: cell.subjectId ? parseInt(cell.subjectId) : null,
              teacherId: cell.teacherId ? parseInt(cell.teacherId) : null,
              roomNo: cell.roomNo || null,
            });
          }
        });
      });

      const res = await api.post('/routine/batch', {
        classId: parseInt(selectedClassId),
        entries,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Class routine saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-routine', selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ['all-routines'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save routine');
    },
  });

  const handleCellChange = (day: string, periodNum: number, field: 'subjectId' | 'teacherId' | 'roomNo', val: string) => {
    const key = `${day}_${periodNum}`;
    setRoutineGrid((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val,
      },
    }));
  };

  // When subject is changed, automatically select its assigned teacher if configured for this class
  const handleSubjectChange = (day: string, periodNum: number, subId: string) => {
    handleCellChange(day, periodNum, 'subjectId', subId);
    if (subId && selectedClassObj?.subjects) {
      const match = selectedClassObj.subjects.find((cs: any) => cs.subjectId.toString() === subId);
      if (match?.teacherId) {
        handleCellChange(day, periodNum, 'teacherId', match.teacherId.toString());
      }
    }
  };

  const printClassRoutine = () => {
    if (!selectedClassObj) return;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = DAYS.map((d) => {
      const periodCells = PERIODS.map((p) => {
        const key = `${d.key}_${p.num}`;
        const cell = routineGrid[key];
        const sub = subjectsData?.find((s: any) => s.id.toString() === cell?.subjectId);
        const teach = teachersData?.find((t: any) => t.id.toString() === cell?.teacherId);
        return `
          <td style="border: 1px solid #1e3a5f; padding: 6px 4px; text-align: center; vertical-align: middle; font-size: 10px;">
            <div style="font-weight: bold; color: #1e3a5f;">${sub?.name || '—'}</div>
            <div style="font-size: 9px; color: #4b5563;">${teach?.fullName?.split(' ')[0] || ''}</div>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td style="border: 1px solid #1e3a5f; font-weight: bold; background: #f8fafc; padding: 6px; font-size: 11px;">
            ${d.name.split(' ')[0]}
          </td>
          ${periodCells}
        </tr>
      `;
    }).join('');

    const periodHeaders = PERIODS.map((p) => `
      <th style="border: 1px solid #1e3a5f; background: #1e3a5f; color: #fff; padding: 6px 3px; font-size: 10px; text-align: center;">
        Period ${p.num}<br/><span style="font-size: 8px; font-weight: normal; opacity: 0.9;">${p.time}</span>
      </th>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Class Routine - ${selectedClassObj.name}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; }
            .meta { font-size: 12px; font-weight: bold; margin: 6px 0 12px 0; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट (स्था. २००७)</div>
            <div style="font-size: 11px; color: #555;">Class Routine & Timetable (दैनिक समय तालिका) • Academic Session 2083/84</div>
          </div>

          <div class="meta">
            <div>Class: <strong>${selectedClassObj.name} ${selectedClassObj.section ? `(${selectedClassObj.section})` : ''}</strong></div>
            <div>Class Teacher: <strong>${selectedClassObj.classTeacher?.fullName || '—'}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #1e3a5f; background: #1e3a5f; color: #fff; padding: 6px; font-size: 10px; width: 80px;">Day / बार</th>
                ${periodHeaders}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>Academic In-Charge</div>
            <div>Class Teacher</div>
            <div>Headmaster / Principal</div>
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
              href="/dashboard/classes"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#1e3a5f] transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Classes</span>
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Clock className="text-[#1e3a5f]" />
            <span>Class Routine & Timetable Maker (दैनिक समय तालिका)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            कक्षागत विषय छनौट, दिन अनुसार रुटिन प्रतिलिपि (Copy Routine), शिक्षक क्ल्यास नियन्त्रण र A4 प्रिन्ट
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={printClassRoutine}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
          >
            <Printer size={14} className="text-blue-600" />
            <span>Print Routine (प्रिन्ट)</span>
          </button>

          <button
            disabled={saveRoutineMutation.isPending}
            onClick={() => saveRoutineMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs disabled:opacity-60"
          >
            <Save size={14} />
            <span>{saveRoutineMutation.isPending ? 'Saving...' : 'Save Routine (रुटिन सेभ गर्नुहोस्)'}</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Select Class (कक्षा छान्नुहोस्):</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full sm:w-56 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#1e3a5f] focus:bg-white focus:outline-hidden"
          >
            {classesData?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Day Tabs */}
        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 text-xs font-bold gap-1 w-full sm:w-auto">
          {DAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => setSelectedDay(d.key)}
              className={`rounded-lg px-3 py-1.5 transition text-[11px] font-bold ${
                selectedDay === d.key ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {d.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Routine Quick Tools Bar: Copy Routine */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-50/70 border border-blue-200 p-3.5 px-5 rounded-2xl text-xs">
        <div className="flex items-center gap-2 text-[#1e3a5f] font-bold">
          <Copy size={16} className="text-blue-700" />
          <span>Copy Routine (अर्को दिनमा दोहोर्याउनुहोस्):</span>
          <span className="text-gray-600 font-normal">
            {DAYS.find((d) => d.key === selectedDay)?.name?.split(' ')[0]} को तालिकालाई
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={copyTargetDay}
            onChange={(e) => setCopyTargetDay(e.target.value)}
            className="rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800"
          >
            <option value="ALL">सबै दिनहरूमा प्रतिलिपि (All Other Days)</option>
            {DAYS.filter((d) => d.key !== selectedDay).map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCopyRoutine}
            className="inline-flex items-center gap-1 bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-4 py-1.5 rounded-xl font-bold transition shadow-2xs"
          >
            <Copy size={13} />
            <span>Copy Now</span>
          </button>
        </div>
      </div>

      {/* Routine Grid for Active Day */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#1e3a5f]">
              {DAYS.find((d) => d.key === selectedDay)?.name} — Period Allocation
            </h3>
            <p className="text-[11px] text-gray-500">
              कक्षा {selectedClassObj?.name} का लागि सूचीकृत विषय ({classSubjects.length} विषय) तथा विषय शिक्षक तोक्नुहोस्
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
            Total 8 Periods
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERIODS.map((period) => {
            const key = `${selectedDay}_${period.num}`;
            const cell = routineGrid[key] || { subjectId: '', teacherId: '', roomNo: '' };
            const conflictInfo = checkConflict(selectedDay, period.num, cell.teacherId);

            return (
              <div
                key={period.num}
                className={`rounded-2xl border p-4 space-y-3 transition relative ${
                  conflictInfo
                    ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300'
                    : cell.subjectId
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-gray-200 bg-slate-50/50 hover:bg-white'
                }`}
              >
                {/* Period Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#1e3a5f] bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                    Period {period.num}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 font-semibold">{period.time}</span>
                </div>

                {/* Tiffin separator notification if period 4 */}
                {period.num === 4 && (
                  <div className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-lg p-1 text-center border border-amber-200">
                    🍱 Followed by Tiffin Break (01:15 - 01:45 PM)
                  </div>
                )}

                {/* Subject Selector (filtered strictly to this class list) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Subject (कक्षाका सूचीकृत विषय)
                  </label>
                  <select
                    value={cell.subjectId}
                    onChange={(e) => handleSubjectChange(selectedDay, period.num, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold text-gray-800 focus:border-[#1e3a5f] focus:outline-hidden"
                  >
                    <option value="">-- No Class / Free --</option>
                    {classSubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher Selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Teacher (तोकिएका शिक्षक)
                  </label>
                  <select
                    value={cell.teacherId}
                    onChange={(e) => handleCellChange(selectedDay, period.num, 'teacherId', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-800 focus:border-[#1e3a5f] focus:outline-hidden"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachersData?.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conflict Alert Banner */}
                {conflictInfo && (
                  <div className="rounded-xl bg-red-100 border border-red-300 p-2 text-[10px] font-bold text-red-800 flex items-start gap-1.5 animate-pulse">
                    <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                    <span>Clash! Teacher is already teaching in {conflictInfo} at this time.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
