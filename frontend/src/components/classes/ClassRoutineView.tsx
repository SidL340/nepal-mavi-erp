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
  CheckSquare,
  Square,
  BookOpen,
  HelpCircle,
  Plus,
  Trash2,
  Coffee,
  Table,
  Edit3,
  Zap,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'SUNDAY', name: 'Sunday (आइतबार)', short: 'आइत' },
  { key: 'MONDAY', name: 'Monday (सोमबार)', short: 'सोम' },
  { key: 'TUESDAY', name: 'Tuesday (मंगलबार)', short: 'मंगल' },
  { key: 'WEDNESDAY', name: 'Wednesday (बुधबार)', short: 'बुध' },
  { key: 'THURSDAY', name: 'Thursday (बिहीबार)', short: 'बिही' },
  { key: 'FRIDAY', name: 'Friday (शुक्रबार)', short: 'शुक्र' },
  { key: 'SATURDAY', name: 'Saturday (शनिबार)', short: 'शनि' },
];

export interface PeriodConfig {
  num: number;
  startTime: string;
  endTime: string;
  hasBreakAfter?: boolean;
  breakTitle?: string;
  breakTime?: string;
}

export const TIMING_PRESETS = [
  {
    id: 'day_standard',
    name: '☀️ मानक दिवा सत्र (Day Shift: 10:25 AM - 04:15 PM)',
    periods: [
      { num: 1, startTime: '10:25 AM', endTime: '11:15 AM' },
      { num: 2, startTime: '11:15 AM', endTime: '12:00 PM' },
      { num: 3, startTime: '12:00 PM', endTime: '12:45 PM' },
      { num: 4, startTime: '12:45 PM', endTime: '01:30 PM', hasBreakAfter: true, breakTitle: 'खाजा समय (Tiffin Break)', breakTime: '01:30 - 01:55 PM' },
      { num: 5, startTime: '01:55 PM', endTime: '02:35 PM' },
      { num: 6, startTime: '02:35 PM', endTime: '03:15 PM' },
      { num: 7, startTime: '03:15 PM', endTime: '03:55 PM' },
      { num: 8, startTime: '03:55 PM', endTime: '04:15 PM' },
    ],
  },
  {
    id: 'morning_standard',
    name: '🌅 बिहानी सत्र (Morning Shift: 06:30 AM - 11:00 AM)',
    periods: [
      { num: 1, startTime: '06:30 AM', endTime: '07:10 AM' },
      { num: 2, startTime: '07:10 AM', endTime: '07:50 AM' },
      { num: 3, startTime: '07:50 AM', endTime: '08:30 AM', hasBreakAfter: true, breakTitle: 'विश्राम (Break)', breakTime: '08:30 - 08:50 AM' },
      { num: 4, startTime: '08:50 AM', endTime: '09:30 AM' },
      { num: 5, startTime: '09:30 AM', endTime: '10:15 AM' },
      { num: 6, startTime: '10:15 AM', endTime: '11:00 AM' },
    ],
  },
  {
    id: 'winter_standard',
    name: '❄️ हिउँदे / छोटो समय (Winter Shift: 10:00 AM - 03:30 PM)',
    periods: [
      { num: 1, startTime: '10:00 AM', endTime: '10:45 AM' },
      { num: 2, startTime: '10:45 AM', endTime: '11:30 AM' },
      { num: 3, startTime: '11:30 AM', endTime: '12:15 PM' },
      { num: 4, startTime: '12:15 PM', endTime: '01:00 PM', hasBreakAfter: true, breakTitle: 'खाजा समय (Tiffin Break)', breakTime: '01:00 - 01:25 PM' },
      { num: 5, startTime: '01:25 PM', endTime: '02:05 PM' },
      { num: 6, startTime: '02:05 PM', endTime: '02:45 PM' },
      { num: 7, startTime: '02:45 PM', endTime: '03:30 PM' },
    ],
  },
];

const DEFAULT_PERIODS: PeriodConfig[] = TIMING_PRESETS[0].periods;

export default function ClassRoutineView({ initialClassId }: { initialClassId?: string }) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || '');
  const [selectedDay, setSelectedDay] = useState('SUNDAY');
  const [viewTab, setViewTab] = useState<'editor' | 'timetable'>('editor');

  // Dynamic Periods configuration
  const [periods, setPeriods] = useState<PeriodConfig[]>(DEFAULT_PERIODS);

  // Days Checkbox state for repeating/applying routine
  const [checkedDays, setCheckedDays] = useState<string[]>([
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
  ]);

  // Routine Matrix state: [day_periodNumber] -> { subjectId, teacherId, roomNo, startTime, endTime }
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

  // Fetch all Subjects for fallback reference
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Auto-select first class if none selected
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

  // Populate routineGrid and periods when routineData changes
  useEffect(() => {
    if (routineData && routineData.length > 0) {
      const grid: Record<string, { subjectId: string; teacherId: string; roomNo: string }> = {};
      const intToDay: Record<number, string> = {
        1: 'SUNDAY',
        2: 'MONDAY',
        3: 'TUESDAY',
        4: 'WEDNESDAY',
        5: 'THURSDAY',
        6: 'FRIDAY',
        7: 'SATURDAY',
      };

      let maxPeriod = 0;
      const loadedPeriodsMap: Record<number, { startTime: string; endTime: string; isBreak?: boolean; breakTitle?: string }> = {};

      routineData.forEach((item: any) => {
        const dayStr = typeof item.dayOfWeek === 'number' ? (intToDay[item.dayOfWeek] || 'SUNDAY') : item.dayOfWeek;
        const periodNo = item.periodNo || item.periodNumber || 1;
        if (periodNo > maxPeriod) maxPeriod = periodNo;

        if (item.startTime || item.endTime) {
          loadedPeriodsMap[periodNo] = {
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            isBreak: item.isBreak,
            breakTitle: item.breakTitle,
          };
        }

        const key = `${dayStr}_${periodNo}`;
        grid[key] = {
          subjectId: item.subjectId ? item.subjectId.toString() : '',
          teacherId: item.teacherId ? item.teacherId.toString() : '',
          roomNo: item.roomNo || '',
        };
      });

      setRoutineGrid(grid);

      // Adjust period list if routine has custom count
      const periodCount = Math.max(maxPeriod, 4);
      setPeriods((prev) => {
        const newPeriods: PeriodConfig[] = [];
        for (let i = 1; i <= periodCount; i++) {
          const existing = prev.find((p) => p.num === i);
          const loaded = loadedPeriodsMap[i];
          const std = DEFAULT_PERIODS[i - 1];

          const validStartTime = (loaded?.startTime && loaded.startTime.trim().length > 0 && !loaded.startTime.startsWith('Period'))
            ? loaded.startTime
            : (existing?.startTime && !existing.startTime.startsWith('Period') ? existing.startTime : (std?.startTime || `Period ${i}`));

          const validEndTime = (loaded?.endTime && loaded.endTime.trim().length > 0)
            ? loaded.endTime
            : (existing?.endTime || (std?.endTime || ''));

          newPeriods.push({
            num: i,
            startTime: validStartTime,
            endTime: validEndTime,
            hasBreakAfter: loaded?.isBreak !== undefined ? loaded.isBreak : (existing?.hasBreakAfter ?? (i === 4)),
            breakTitle: loaded?.breakTitle || existing?.breakTitle || (i === 4 ? 'खाजा समय (Tiffin Break)' : ''),
            breakTime: existing?.breakTime || (i === 4 ? '01:30 - 01:55 PM' : ''),
          });
        }
        return newPeriods;
      });
    } else if (routineData && routineData.length === 0) {
      // Clear grid for unconfigured class
      setRoutineGrid({});
      // Keep standard school periods
      const savedDefault = typeof window !== 'undefined' ? localStorage.getItem('school_default_routine_timings') : null;
      if (savedDefault) {
        try {
          setPeriods(JSON.parse(savedDefault));
        } catch {
          setPeriods(DEFAULT_PERIODS);
        }
      } else {
        setPeriods(DEFAULT_PERIODS);
      }
    }
  }, [routineData]);

  const selectedClassObj = classesData?.find((c: any) => c.id.toString() === selectedClassId);

  // ── STRICT CLASS-SPECIFIC SUBJECT FILTERING WITH ASSIGNED TEACHER ──
  const classSubjects: any[] = (selectedClassObj?.subjects && selectedClassObj.subjects.length > 0)
    ? selectedClassObj.subjects
        .map((cs: any) => {
          const sub = cs.subject || subjectsData?.find((s: any) => s.id === cs.subjectId);
          if (!sub) return null;
          const assignedTeacher = cs.teacher || teachersData?.find((t: any) => t.id === cs.teacherId);
          return {
            ...sub,
            classSubjectId: cs.id,
            assignedTeacherId: cs.teacherId || assignedTeacher?.id || null,
            assignedTeacherName: assignedTeacher?.fullName || null,
          };
        })
        .filter(Boolean)
    : [];

  // Check teacher conflict across other classes (returns full conflict details)
  const checkConflict = (day: string, period: number, teacherIdStr: string | number) => {
    if (!teacherIdStr || !allRoutinesData) return null;
    const tid = parseInt(teacherIdStr.toString());
    if (!tid) return null;

    const dayIntMap: Record<string, number> = {
      'SUNDAY': 1, 'MONDAY': 2, 'TUESDAY': 3, 'WEDNESDAY': 4, 'THURSDAY': 5, 'FRIDAY': 6, 'SATURDAY': 7
    };
    const targetDayInt = dayIntMap[day?.toUpperCase()] || (typeof day === 'number' ? day : 1);

    const conflict = allRoutinesData.find((r: any) => {
      // 1. MUST be another class (NEVER match the current selected class)
      if (r.classId?.toString() === selectedClassId?.toString()) return false;
      
      // 2. MUST NOT be a break item
      if (r.isBreak) return false;

      // 3. MUST match the exact teacher
      if (!r.teacherId || parseInt(r.teacherId) !== tid) return false;

      // 4. MUST have a real subject or teacher entry (ignore empty slots)
      if (!r.subjectId && !r.teacherId) return false;

      // 5. MUST match the exact Period Number
      const rPeriod = parseInt(r.periodNo || r.periodNumber);
      if (rPeriod !== period) return false;

      // 6. MUST match the exact Day of the week
      const rDayInt = typeof r.dayOfWeek === 'number' ? r.dayOfWeek : dayIntMap[r.dayOfWeek?.toUpperCase()] || 0;
      const isDayMatch = (rDayInt === targetDayInt) || (typeof r.dayOfWeek === 'string' && r.dayOfWeek.toUpperCase() === day.toUpperCase());
      return isDayMatch;
    });

    if (!conflict) return null;

    return {
      className: conflict.class?.name || 'अर्को कक्षा',
      teacherName: conflict.teacher?.fullName || 'शिक्षक',
      subjectName: conflict.subject?.name || '',
      periodNo: period,
      day: day,
    };
  };

  // Helper to check if a specific teacher is busy in a slot (returns conflicting class name or null)
  const getTeacherConflictForSlot = (day: string, period: number, teacherId: string | number) => {
    const res = checkConflict(day, period, teacherId);
    return res ? res.className : null;
  };

  // Add new period to class
  const handleAddPeriod = () => {
    const nextNum = periods.length + 1;
    setPeriods([
      ...periods,
      {
        num: nextNum,
        startTime: `0${Math.min(nextNum + 2, 4)}:00 PM`,
        endTime: `0${Math.min(nextNum + 2, 4)}:40 PM`,
        hasBreakAfter: false,
      },
    ]);
    toast.success(`घण्टी ${nextNum} थपियो (Period ${nextNum} added)!`);
  };

  // Remove last period
  const handleRemovePeriod = () => {
    if (periods.length <= 1) {
      toast.error('कम्तीमा १ घण्टी हुनै पर्छ।');
      return;
    }
    const removedNum = periods.length;
    setPeriods(periods.slice(0, -1));
    toast.success(`घण्टी ${removedNum} हटाइयो।`);
  };

  // Set explicit period count (e.g., 5, 6, 7, 8)
  const handleSetPeriodCount = (count: number) => {
    if (count < 1 || count > 12) return;
    setPeriods((prev) => {
      const defaultTimes = [
        { startTime: '10:25 AM', endTime: '11:15 AM', hasBreakAfter: false },
        { startTime: '11:15 AM', endTime: '12:00 PM', hasBreakAfter: false },
        { startTime: '12:00 PM', endTime: '12:45 PM', hasBreakAfter: false },
        { startTime: '12:45 PM', endTime: '01:30 PM', hasBreakAfter: true, breakTitle: 'खाजा समय (Tiffin Break)', breakTime: '01:30 - 01:55 PM' },
        { startTime: '01:55 PM', endTime: '02:35 PM', hasBreakAfter: false },
        { startTime: '02:35 PM', endTime: '03:15 PM', hasBreakAfter: false },
        { startTime: '03:15 PM', endTime: '03:55 PM', hasBreakAfter: false },
        { startTime: '03:55 PM', endTime: '04:15 PM', hasBreakAfter: false },
      ];

      const newPeriods: PeriodConfig[] = [];
      for (let i = 1; i <= count; i++) {
        const existing = prev.find((p) => p.num === i);
        const std = defaultTimes[i - 1];
        newPeriods.push({
          num: i,
          startTime: existing?.startTime || std?.startTime || `10:${i * 40} AM`,
          endTime: existing?.endTime || std?.endTime || '',
          hasBreakAfter: existing?.hasBreakAfter ?? (i === 4),
          breakTitle: existing?.breakTitle || (i === 4 ? 'खाजा समय (Tiffin Break)' : ''),
          breakTime: existing?.breakTime || (i === 4 ? '01:30 - 01:55 PM' : ''),
        });
      }
      return newPeriods;
    });
    toast.success(`यस कक्षाको लागि कुल ${count} घण्टी तालिका समायोजन गरियो!`);
  };

  // Update Period timing or Break settings
  const handleUpdatePeriodConfig = (num: number, updates: Partial<PeriodConfig>) => {
    setPeriods((prev) =>
      prev.map((p) => (p.num === num ? { ...p, ...updates } : p))
    );
  };

  // Toggle single day checkbox
  const toggleDayCheckbox = (dayKey: string) => {
    setCheckedDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  // Preset day selections
  const selectPresetDays = (preset: 'SUN_THU' | 'SUN_FRI' | 'ALL' | 'CLEAR') => {
    if (preset === 'SUN_THU') {
      setCheckedDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
    } else if (preset === 'SUN_FRI') {
      setCheckedDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
    } else if (preset === 'ALL') {
      setCheckedDays(DAYS.map((d) => d.key));
    } else if (preset === 'CLEAR') {
      setCheckedDays([]);
    }
  };

  // Copy routine from active selectedDay to all currently CHECKED days
  const handleApplyToCheckedDays = () => {
    if (checkedDays.length === 0) {
      toast.error('कृपया कम्तीमा एउटा दिन छान्नुहोस् (Select at least one day).');
      return;
    }

    setRoutineGrid((prev) => {
      const next = { ...prev };
      checkedDays.forEach((targetKey) => {
        periods.forEach((p) => {
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
    toast.success(`${srcName} को तालिका चयनित ${checkedDays.length} दिनहरूमा सफलतापूर्वक लागू गरियो!`);
  };

  // Copy a single period across all checked days
  const handleApplySinglePeriodToCheckedDays = (periodNum: number) => {
    if (checkedDays.length === 0) {
      toast.error('कृपया माथिबाट कम्तीमा एउटा दिनको Checkbox छान्नुहोस्।');
      return;
    }

    const sourceKey = `${selectedDay}_${periodNum}`;
    const sourceCell = routineGrid[sourceKey];
    if (!sourceCell || (!sourceCell.subjectId && !sourceCell.teacherId)) {
      toast.error('यो पिरियडमा कुनै विषय वा शिक्षक तोकिएको छैन।');
      return;
    }

    setRoutineGrid((prev) => {
      const next = { ...prev };
      checkedDays.forEach((targetDay) => {
        const destKey = `${targetDay}_${periodNum}`;
        next[destKey] = { ...sourceCell };
      });
      return next;
    });

    toast.success(`घण्टी ${periodNum} चयनित ${checkedDays.length} दिनहरूमा लागू गरियो!`);
  };

  // Copy a single period across specific chosen days (e.g. Sun-Tue, Wed-Fri)
  const handleApplySinglePeriodToSpecificDays = (periodNum: number, targetDays: string[]) => {
    if (!targetDays || targetDays.length === 0) return;

    const sourceKey = `${selectedDay}_${periodNum}`;
    const sourceCell = routineGrid[sourceKey];
    if (!sourceCell || (!sourceCell.subjectId && !sourceCell.teacherId)) {
      toast.error('यो पिरियडमा कुनै विषय वा शिक्षक तोकिएको छैन।');
      return;
    }

    setRoutineGrid((prev) => {
      const next = { ...prev };
      targetDays.forEach((targetDay) => {
        const destKey = `${targetDay}_${periodNum}`;
        next[destKey] = { ...sourceCell };
      });
      return next;
    });

    const daysLabel = targetDays.map((k) => DAYS.find((d) => d.key === k)?.short || k).join(', ');
    toast.success(`घण्टी ${periodNum} (${daysLabel}) दिनहरूमा सफलतापूर्वक लागू गरियो!`);
  };

  // List all conflicts currently in routineGrid across the entire week
  const currentGridConflicts = React.useMemo(() => {
    const conflictsList: { dayKey: string; dayShort: string; periodNum: number; conflict: any }[] = [];
    DAYS.forEach((d) => {
      periods.forEach((p) => {
        const key = `${d.key}_${p.num}`;
        const cell = routineGrid[key];
        if (cell && cell.teacherId) {
          const conf = checkConflict(d.key, p.num, cell.teacherId);
          if (conf) {
            conflictsList.push({
              dayKey: d.key,
              dayShort: d.short,
              periodNum: p.num,
              conflict: conf,
            });
          }
        }
      });
    });
    return conflictsList;
  }, [routineGrid, periods, allRoutinesData, selectedClassId]);

  // Sync Timings Mutation — applies current period timings to ALL classes
  const syncTimingsMutation = useMutation({
    mutationFn: async () => {
      const allClassIds = classesData?.map((c: any) => c.id) || [];
      const res = await api.post('/routine/sync-timings', {
        targetClassIds: allClassIds,
        periods,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'घण्टी समय तालिका विद्यालयका सम्पूर्ण कक्षाहरूमा सफलतापूर्वक लागू भयो!');
      if (typeof window !== 'undefined') {
        localStorage.setItem('school_default_routine_timings', JSON.stringify(periods));
      }
      queryClient.invalidateQueries({ queryKey: ['class-routine'] });
      queryClient.invalidateQueries({ queryKey: ['all-routines'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'घण्टी समय तालिका लागू गर्न सकिएन।');
    },
  });

  // Load Preset
  const handleLoadPreset = (presetId: string) => {
    const preset = TIMING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setPeriods(preset.periods);
    toast.success(`'${preset.name.split('(')[0].trim()}' घण्टी ढाँचा लोड भयो!`);
  };

  // Copy Timing From Another Class
  const handleCopyTimingFromClass = (sourceClassIdStr: string) => {
    if (!sourceClassIdStr || !allRoutinesData) return;
    const sourceRoutines = allRoutinesData.filter((r: any) => r.classId.toString() === sourceClassIdStr);
    if (!sourceRoutines || sourceRoutines.length === 0) {
      toast.error('चयन गरिएको कक्षामा कुनै रुटिन तालिका फेला परेन।');
      return;
    }

    const maxPeriod = Math.max(...sourceRoutines.map((r: any) => r.periodNo || 1), 4);
    const newPeriods: PeriodConfig[] = [];
    for (let i = 1; i <= maxPeriod; i++) {
      const match = sourceRoutines.find((r: any) => (r.periodNo || 1) === i && (r.startTime || r.endTime));
      newPeriods.push({
        num: i,
        startTime: match?.startTime || `10:${i * 45} AM`,
        endTime: match?.endTime || '',
        hasBreakAfter: match?.isBreak || (i === 4),
        breakTitle: match?.breakTitle || (i === 4 ? 'खाजा समय (Tiffin Break)' : ''),
        breakTime: i === 4 ? '01:30 - 01:55 PM' : '',
      });
    }
    setPeriods(newPeriods);
    const srcClassName = classesData?.find((c: any) => c.id.toString() === sourceClassIdStr)?.name || 'Class';
    toast.success(`${srcClassName} को घण्टी समय तालिका लोड गरियो!`);
  };

  // Batch Save Routine Mutation
  const saveRoutineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) throw new Error('Please select a class');

      // Conflict warning check before saving
      if (currentGridConflicts.length > 0) {
        const conflictDescriptions = currentGridConflicts
          .slice(0, 5)
          .map((c) => `• ${c.conflict.teacherName} (${c.dayShort}, घण्टी ${c.periodNum}) ➜ ${c.conflict.className}`)
          .join('\n');

        const proceed = confirm(
          `⚠️ शिक्षक समय द्वन्द्व भेटियो (Teacher Schedule Conflicts Detected):\n\n${conflictDescriptions}${
            currentGridConflicts.length > 5 ? `\n... र थप ${currentGridConflicts.length - 5} वटा` : ''
          }\n\nके तपाईं यद्यपि यो रुटिन सेभ गर्न अगाडि बढ्न चाहनुहुन्छ?`
        );
        if (!proceed) {
          throw new Error('रुटिन सेभ रद्द गरियो। कृपया शिक्षकको समय जुधेको सच्याउनुहोस्।');
        }
      }

      const entries: any[] = [];

      DAYS.forEach((d) => {
        periods.forEach((p) => {
          const key = `${d.key}_${p.num}`;
          const cell = routineGrid[key];
          if (cell && (cell.subjectId || cell.teacherId)) {
            entries.push({
              classId: parseInt(selectedClassId),
              dayOfWeek: d.key,
              periodNumber: p.num,
              startTime: p.startTime || '',
              endTime: p.endTime || '',
              isBreak: false,
              subjectId: cell.subjectId ? parseInt(cell.subjectId) : null,
              teacherId: cell.teacherId ? parseInt(cell.teacherId) : null,
              roomNo: cell.roomNo || null,
            });
          }
        });
      });

      const res = await api.post('/routine/batch-save', {
        classId: parseInt(selectedClassId),
        entries,
        routines: entries,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'कक्षाको रुटिन सफलतापूर्वक सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['class-routine', selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ['all-routines'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'रुटिन सुरक्षित गर्न सकिएन।');
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

    if (field === 'teacherId' && val) {
      const conflict = checkConflict(day, periodNum, val);
      if (conflict) {
        const dayNepali = DAYS.find((d) => d.key === day)?.short || day;
        toast.error(
          `⚠️ शिक्षक जुध्यो (Conflict)! ${conflict.teacherName} ${dayNepali} को घण्टी ${periodNum} मा पहिले नै '${conflict.className}' मा तोकिनुभएको छ।`,
          { duration: 5000, id: `conflict-teacher-${day}-${periodNum}` }
        );
      }
    }
  };

  // When subject is changed, automatically fetch and select its assigned teacher for this class
  const handleSubjectChange = (day: string, periodNum: number, subId: string) => {
    const key = `${day}_${periodNum}`;
    const matchedSubject = classSubjects.find((s: any) => s.id.toString() === subId);
    const assignedTeacherId = matchedSubject?.assignedTeacherId ? matchedSubject.assignedTeacherId.toString() : '';

    setRoutineGrid((prev) => {
      const current = prev[key] || { subjectId: '', teacherId: '', roomNo: '' };
      return {
        ...prev,
        [key]: {
          ...current,
          subjectId: subId,
          // If a teacher was already assigned to this subject in the class, auto-assign
          teacherId: assignedTeacherId || (subId ? current.teacherId : ''),
        },
      };
    });

    if (subId && assignedTeacherId) {
      const conflict = checkConflict(day, periodNum, assignedTeacherId);
      const dayNepali = DAYS.find((d) => d.key === day)?.short || day;
      if (conflict) {
        toast.error(
          `⚠️ शिक्षक जुध्यो (Conflict)! ${conflict.teacherName} ${dayNepali} को घण्टी ${periodNum} मा पहिले नै '${conflict.className}' मा व्यस्त हुनुहुन्छ।`,
          { duration: 5000, id: `conflict-${day}-${periodNum}` }
        );
      } else if (matchedSubject?.assignedTeacherName) {
        toast.success(
          `'${matchedSubject.name}' को शिक्षक '${matchedSubject.assignedTeacherName}' स्वतः छानियो!`,
          { id: `auto-teacher-${periodNum}`, duration: 2500 }
        );
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
      const periodCells = periods.map((p) => {
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

    const periodHeaders = periods.map((p) => `
      <th style="border: 1px solid #1e3a5f; background: #1e3a5f; color: #fff; padding: 6px 3px; font-size: 10px; text-align: center;">
        Period ${p.num}<br/><span style="font-size: 8px; font-weight: normal; opacity: 0.9;">${p.startTime} - ${p.endTime}</span>
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
            <div>Total Periods: <strong>${periods.length} Periods</strong></div>
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
    <div className="space-y-6">
      {/* Action Header inside tab */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Clock className="text-[#1e3a5f]" size={18} />
            <span>Class Routine & Timetable (दैनिक समय तालिका)</span>
          </h2>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            समय तालिका निर्धारण, खाजा समय, शिक्षक अटो-चयन र सम्पूर्ण साप्ताहिक रुटिन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200">
            <button
              onClick={() => setViewTab('editor')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewTab === 'editor' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 size={13} />
              <span>घण्टी सम्पादक (Editor)</span>
            </button>
            <button
              onClick={() => setViewTab('timetable')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewTab === 'timetable' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table size={13} />
              <span>साप्ताहिक तालिका (Timetable)</span>
            </button>
          </div>

          <button
            onClick={printClassRoutine}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
          >
            <Printer size={14} className="text-blue-600" />
            <span>Print (प्रिन्ट)</span>
          </button>

          <button
            disabled={saveRoutineMutation.isPending}
            onClick={() => saveRoutineMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Save size={14} />
            <span>{saveRoutineMutation.isPending ? 'Saving...' : 'Save Routine (सेभ गर्नुहोस्)'}</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar & Periods Count Manager */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 flex items-center gap-2.5">
            <label className="text-xs font-bold text-gray-700 whitespace-nowrap flex items-center gap-1">
              <School size={14} className="text-[#1e3a5f]" />
              <span>कक्षा छान्नुहोस् (Class):</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#1e3a5f] focus:bg-white focus:outline-hidden"
            >
              {classesData?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Period Count Selector & Dynamic Period Controls */}
          <div className="md:col-span-8 flex flex-wrap items-center justify-start md:justify-end gap-1.5">
            <div className="flex items-center gap-1 bg-slate-100 border border-gray-200 px-2.5 py-1 rounded-xl text-xs">
              <Sliders size={13} className="text-gray-600" />
              <span className="font-bold text-gray-700">घण्टी संख्या:</span>
              <span className="font-black text-[#1e3a5f] px-1.5 py-0.5 bg-blue-100 rounded-md text-xs">
                {periods.length} घण्टी
              </span>
            </div>

            {/* Quick Count Pills: 5, 6, 7, 8 */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 gap-1">
              {[5, 6, 7, 8].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleSetPeriodCount(cnt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    periods.length === cnt
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                  title={`${cnt} घण्टीको तालिका बनाउनुहोस्`}
                >
                  {cnt} घण्टी
                </button>
              ))}
            </div>

            {/* Auto-set from Class Subjects Count */}
            {classSubjects.length > 0 && classSubjects.length !== periods.length && (
              <button
                type="button"
                onClick={() => handleSetPeriodCount(classSubjects.length)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                title={`यस कक्षामा ${classSubjects.length} विषय दर्ता छन्`}
              >
                <Sparkles size={13} className="text-indigo-600" />
                <span>💡 {classSubjects.length} विषय अनुसार सेट</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddPeriod}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
              title="Add another period for this class"
            >
              <Plus size={13} />
              <span>+ घण्टी थप्नुहोस्</span>
            </button>

            <button
              type="button"
              onClick={handleRemovePeriod}
              disabled={periods.length <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer disabled:opacity-40"
              title="Remove last period"
            >
              <Trash2 size={13} />
              <span>- घटाउनुहोस्</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TIME & BREAKS SCHEDULE CONFIGURATOR ─── */}
      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <h3 className="text-xs font-black text-gray-900">
                घण्टी समय तालिका (School Bell & Break Timings)
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 font-nepali">
              समय तालिका एक पटक मिलाएर <strong>"सबै कक्षामा लागू"</strong> गर्न सक्नुहुन्छ, अथवा कक्षा अनुसार फरक समय राख्न सक्नुहुन्छ।
            </p>
          </div>

          {/* Copy and Bulk Sync Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy From Another Class */}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleCopyTimingFromClass(e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded-xl border border-gray-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="" disabled>🔄 अर्को कक्षाबाट समय लिनुहोस्...</option>
              {classesData
                ?.filter((c: any) => c.id.toString() !== selectedClassId)
                ?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
            </select>

            {/* Apply to All Classes (Bulk Sync) */}
            <button
              type="button"
              disabled={syncTimingsMutation.isPending}
              onClick={() => {
                if (confirm('के तपाईं यो घण्टी समय तालिका विद्यालयका सम्पूर्ण कक्षाहरूमा लागू गर्न चाहनुहुन्छ? (Sync standard bell timings to ALL classes?)')) {
                  syncTimingsMutation.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Apply currently defined period start/end timings to all classes"
            >
              <Zap size={14} className={syncTimingsMutation.isPending ? 'animate-pulse' : ''} />
              <span>{syncTimingsMutation.isPending ? 'लागू हुँदैछ...' : '⚡ सबै कक्षामा यो समय लागू गर्नुहोस् (Sync to All)'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {periods.map((p) => (
            <div
              key={p.num}
              className={`p-3 rounded-xl border text-xs space-y-2.5 transition ${
                p.hasBreakAfter ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/60 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#1e3a5f]">घण्टी {p.num} (Period {p.num})</span>
                {p.hasBreakAfter && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Coffee size={11} />
                    <span>खाजा समय</span>
                  </span>
                )}
              </div>

              {/* Start & End Time Inputs */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">From (सुरु):</label>
                  <input
                    type="text"
                    value={p.startTime}
                    onChange={(e) => handleUpdatePeriodConfig(p.num, { startTime: e.target.value })}
                    placeholder="10:15 AM"
                    className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">To (अन्त्य):</label>
                  <input
                    type="text"
                    value={p.endTime}
                    onChange={(e) => handleUpdatePeriodConfig(p.num, { endTime: e.target.value })}
                    placeholder="11:00 AM"
                    className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Break toggle after this period */}
              <div className="pt-1.5 border-t border-gray-200/60 space-y-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!p.hasBreakAfter}
                    onChange={(e) =>
                      handleUpdatePeriodConfig(p.num, {
                        hasBreakAfter: e.target.checked,
                        breakTitle: e.target.checked ? (p.breakTitle || 'खाजा समय (Tiffin Break)') : '',
                        breakTime: e.target.checked ? (p.breakTime || '01:15 - 01:45 PM') : '',
                      })
                    }
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>यस पछि खाजा/विश्राम छ?</span>
                </label>

                {p.hasBreakAfter && (
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <input
                      type="text"
                      value={p.breakTitle || ''}
                      onChange={(e) => handleUpdatePeriodConfig(p.num, { breakTitle: e.target.value })}
                      placeholder="खाजा समय"
                      className="w-full px-1.5 py-0.5 text-[10px] font-medium rounded border border-amber-300 bg-white"
                    />
                    <input
                      type="text"
                      value={p.breakTime || ''}
                      onChange={(e) => handleUpdatePeriodConfig(p.num, { breakTime: e.target.value })}
                      placeholder="01:15 - 01:45 PM"
                      className="w-full px-1.5 py-0.5 text-[10px] font-medium rounded border border-amber-300 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── DAYS CHECKBOX TOOLBAR ─── */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200 p-4 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#1e3a5f]">
              <CheckSquare size={16} className="text-blue-700" />
              <span>रुटिन दोहोर्‍याउने दिनहरू छान्नुहोस् (Repeat Routine Days Checkbox):</span>
            </div>
            <p className="text-[11px] text-gray-600 font-nepali">
              कुन-कुन दिन कक्षा सञ्चालन हुन्छ, टिक लगाउनुहोस् र <strong className="text-blue-900">{DAYS.find((d) => d.key === selectedDay)?.name.split(' ')[0]}</strong> को रुटिन एकै क्लिकमा लागू गर्नुहोस्।
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-gray-500 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => selectPresetDays('SUN_THU')}
              className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              आइत - बिही (Sun-Thu)
            </button>
            <button
              type="button"
              onClick={() => selectPresetDays('SUN_FRI')}
              className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              आइत - शुक्र (Sun-Fri)
            </button>
            <button
              type="button"
              onClick={() => selectPresetDays('ALL')}
              className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              सबै ७ दिन (All)
            </button>
            <button
              type="button"
              onClick={() => selectPresetDays('CLEAR')}
              className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-gray-100 transition cursor-pointer"
            >
              खाली (Clear)
            </button>
          </div>
        </div>

        {/* Days Checkboxes Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-blue-100">
          {DAYS.map((d) => {
            const isChecked = checkedDays.includes(d.key);
            const isCurrentActiveDay = selectedDay === d.key;
            return (
              <label
                key={d.key}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer select-none ${
                  isChecked
                    ? 'bg-white border-blue-400 text-blue-900 shadow-2xs ring-1 ring-blue-300'
                    : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleDayCheckbox(d.key)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{d.name}</span>
                {isCurrentActiveDay && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Active
                  </span>
                )}
              </label>
            );
          })}

          <button
            type="button"
            onClick={handleApplyToCheckedDays}
            className="ml-auto inline-flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Copy size={14} />
            <span>चयनित सबै दिनहरूमा तालिका लागू गर्नुहोस् (Apply to Checked Days)</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: PERIOD-BY-PERIOD EDITOR (घण्टी सम्पादक) ─── */}
      {viewTab === 'editor' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-6">
          {/* Day Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#1e3a5f]">
                {DAYS.find((d) => d.key === selectedDay)?.name} — घण्टी विभाजन (Period Allocation)
              </h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                कक्षा <strong className="text-gray-800">{selectedClassObj?.name}</strong> मा दर्ता गरिएका सूचीकृत विषयहरू ({classSubjects.length} विषय) तथा शिक्षक तोक्नुहोस्
              </p>
            </div>

            {/* Day Selector Buttons */}
            <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 text-xs font-bold gap-1">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`rounded-lg px-3 py-1.5 transition text-[11px] font-bold cursor-pointer ${
                    selectedDay === d.key ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {d.short} ({d.name.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>

          {/* Warning if no subjects entered for this class */}
          {classSubjects.length === 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  यस कक्षा ({selectedClassObj?.name}) मा हालसम्म कुनै पनि विषय दर्ता गरिएको छैन।
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-nepali">
                  रुटिन बनाउनका लागि पहिले कक्षामा विषय र शिक्षक दर्ता हुनुपर्दछ। कृपया माथिको &quot;Classes &amp; Sections&quot; ट्याबमा गएर विषयहरू थप्नुहोस्।
                </p>
              </div>
            </div>
          )}

          {/* Period Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {periods.map((period) => {
              const key = `${selectedDay}_${period.num}`;
              const cell = routineGrid[key] || { subjectId: '', teacherId: '', roomNo: '' };
              const conflictInfo = checkConflict(selectedDay, period.num, cell.teacherId);

              // Gather other days assignments for this period to help with alternating/split subjects
              const otherDaysSummary = DAYS
                .filter((d) => d.key !== selectedDay)
                .map((d) => {
                  const oKey = `${d.key}_${period.num}`;
                  const oCell = routineGrid[oKey];
                  const oSub = subjectsData?.find((s: any) => s.id.toString() === oCell?.subjectId);
                  const oTeach = teachersData?.find((t: any) => t.id.toString() === oCell?.teacherId);
                  return oSub ? { dayShort: d.short, dayKey: d.key, subName: oSub.name, teachName: oTeach?.fullName?.split(' ')[0] } : null;
                })
                .filter(Boolean);

              return (
                <div
                  key={period.num}
                  className={`rounded-2xl border p-4 space-y-3 transition relative flex flex-col justify-between ${
                    conflictInfo
                      ? 'border-red-400 bg-red-50/50 ring-2 ring-red-300 shadow-xs'
                      : cell.subjectId
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-gray-200 bg-slate-50/50 hover:bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Period Badge & Timing */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#1e3a5f] bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                        घण्टी {period.num} (Period {period.num})
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 font-semibold">
                        {period.startTime} - {period.endTime}
                      </span>
                    </div>

                    {/* Tiffin / Break Alert */}
                    {period.hasBreakAfter && (
                      <div className="text-[10px] font-bold text-amber-800 bg-amber-50 rounded-lg p-1 text-center border border-amber-200 flex items-center justify-center gap-1">
                        <Coffee size={12} />
                        <span>{period.breakTitle || 'खाजा समय'} ({period.breakTime || 'Break'})</span>
                      </div>
                    )}

                    {/* Subject Selector (filtered STRICTLY to this class list) */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 flex items-center justify-between">
                        <span>Subject (यस कक्षाका विषय)</span>
                        <span className="text-[9px] text-gray-400">({classSubjects.length} उपलब्ध)</span>
                      </label>
                      <select
                        value={cell.subjectId}
                        onChange={(e) => handleSubjectChange(selectedDay, period.num, e.target.value)}
                        className={`w-full rounded-xl border p-2 text-xs font-bold text-gray-800 focus:border-[#1e3a5f] focus:outline-hidden ${
                          cell.subjectId ? 'bg-white border-blue-300' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">-- खाली / No Class --</option>
                        {classSubjects.map((sub: any) => {
                          const isTeacherBusy = sub.assignedTeacherId ? getTeacherConflictForSlot(selectedDay, period.num, sub.assignedTeacherId) : null;
                          return (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} {sub.code ? `(${sub.code})` : ''} 
                              {sub.assignedTeacherName ? ` — 👤 ${sub.assignedTeacherName}` : ''}
                              {isTeacherBusy ? ` [⚠️ ${isTeacherBusy} मा व्यस्त]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Teacher Selector with collision indicators */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 flex items-center justify-between">
                        <span>Teacher (तोकिएका शिक्षक)</span>
                        {cell.teacherId && !conflictInfo && (
                          <span className="text-[9px] text-emerald-700 font-bold">✓ शिक्षक उपलब्ध</span>
                        )}
                        {conflictInfo && (
                          <span className="text-[9px] text-red-700 font-bold">⚠️ समय जुध्यो</span>
                        )}
                      </label>
                      <select
                        value={cell.teacherId}
                        onChange={(e) => handleCellChange(selectedDay, period.num, 'teacherId', e.target.value)}
                        className={`w-full rounded-xl border p-2 text-xs font-semibold text-gray-800 focus:border-[#1e3a5f] focus:outline-hidden ${
                          conflictInfo
                            ? 'bg-red-50 border-red-400 text-red-900 font-bold'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">-- शिक्षक छान्नुहोस् --</option>
                        {teachersData?.map((t: any) => {
                          const busyClass = getTeacherConflictForSlot(selectedDay, period.num, t.id);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.fullName} {busyClass ? ` [⚠️ ${busyClass} मा व्यस्त]` : ' ✓ उपलब्ध'}
                            </option>
                          );
                        })}
                      </select>

                      {/* Auto-Assigned Teacher Helper Info */}
                      {(() => {
                        const matchedSub = classSubjects.find((s: any) => s.id.toString() === cell.subjectId);
                        if (!matchedSub?.assignedTeacherName) return null;
                        const isAutoMatched = cell.teacherId === matchedSub.assignedTeacherId?.toString();
                        return (
                          <div className={`flex items-center justify-between text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-1 ${
                            isAutoMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            <span className="flex items-center gap-1 truncate">
                              <Sparkles size={10} className={isAutoMatched ? 'text-emerald-600 shrink-0' : 'text-amber-600 shrink-0'} />
                              <span>विषय शिक्षक: {matchedSub.assignedTeacherName}</span>
                            </span>
                            {!isAutoMatched && (
                              <button
                                type="button"
                                onClick={() => handleCellChange(selectedDay, period.num, 'teacherId', matchedSub.assignedTeacherId?.toString() || '')}
                                className="text-[9px] text-blue-700 underline font-bold hover:text-blue-900 shrink-0 ml-1 cursor-pointer"
                              >
                                स्वतः मिलाउनुहोस्
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Prominent Conflict Alert Banner */}
                    {conflictInfo && (
                      <div className="rounded-xl bg-red-100 border border-red-300 p-2 text-[10px] font-bold text-red-900 flex items-start gap-1.5 animate-pulse">
                        <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-red-950">समय जुध्यो (Teacher Conflict)!</div>
                          <div>
                            शिक्षक <strong>{conflictInfo.teacherName}</strong> यस दिनको घण्टी {period.num} मा पहिले नै <strong>'{conflictInfo.className}'</strong> मा व्यस्त हुनुहुन्छ।
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alternating/Different Subjects Across the Week Preview */}
                    {otherDaysSummary.length > 0 && (
                      <div className="rounded-lg bg-slate-100 border border-gray-200 p-1.5 text-[10px] text-gray-600 space-y-0.5">
                        <div className="font-bold text-gray-700 flex items-center justify-between">
                          <span>📅 अन्य दिनका विषय (Other Days):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {otherDaysSummary.map((od: any, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-white rounded border border-gray-200 text-[9px] font-semibold text-[#1e3a5f]">
                              {od.dayShort}: <strong>{od.subName}</strong> {od.teachName ? `(${od.teachName})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Multi-Day Split & Repeat Controls */}
                  <div className="pt-2 border-t border-gray-100/80 mt-2 space-y-1.5">
                    <div className="text-[9px] font-bold text-gray-500 uppercase">यो घण्टी अन्य दिनमा लागू गर्नुहोस्:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplySinglePeriodToSpecificDays(period.num, ['SUNDAY', 'MONDAY', 'TUESDAY'])}
                        className="text-[9px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-1 px-1 rounded-lg transition text-center cursor-pointer"
                        title="Apply to Sunday, Monday, Tuesday"
                      >
                        आइत-मंग (Sun-Tue)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySinglePeriodToSpecificDays(period.num, ['WEDNESDAY', 'THURSDAY', 'FRIDAY'])}
                        className="text-[9px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-1 px-1 rounded-lg transition text-center cursor-pointer"
                        title="Apply to Wednesday, Thursday, Friday"
                      >
                        बुध-शुक्र (Wed-Fri)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySinglePeriodToCheckedDays(period.num)}
                      className="w-full text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/60 hover:bg-blue-100/80 py-1 rounded-lg transition text-center cursor-pointer border border-blue-100"
                      title={`Apply Period ${period.num} to all checked days`}
                    >
                      ↳ चेक गरिएका दिनहरूमा लागू
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FULL WEEKLY TIMETABLE MATRIX (सम्पूर्ण साप्ताहिक समय तालिका) ─── */}
      {viewTab === 'timetable' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#1e3a5f]">
                {selectedClassObj?.name} — Full Weekly Timetable Matrix (सम्पूर्ण साप्ताहिक तालिका)
              </h3>
              <p className="text-xs text-gray-500 font-nepali">
                कुनै पनि कोठा (Cell) मा क्लिक गरी सो दिनको रुटिन तुरुन्तै सम्पादन गर्न सक्नुहुन्छ।
              </p>
            </div>
            <button
              onClick={printClassRoutine}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
            >
              <Printer size={13} className="text-blue-600" />
              <span>प्रिन्ट गर्नुहोस्</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-2xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="p-3 border-r border-[#2a5280] font-black w-24">Day / बार</th>
                  {periods.map((p) => (
                    <th key={p.num} className="p-2.5 border-r border-[#2a5280] text-center font-bold">
                      <div>Period {p.num}</div>
                      <div className="text-[10px] font-normal opacity-85">{p.startTime} - {p.endTime}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {DAYS.map((d) => (
                  <tr key={d.key} className="hover:bg-blue-50/20 transition">
                    <td
                      onClick={() => {
                        setSelectedDay(d.key);
                        setViewTab('editor');
                      }}
                      className="p-3 font-extrabold text-[#1e3a5f] bg-slate-50 border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition"
                      title="Click to edit this day in Editor"
                    >
                      <div>{d.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{d.short} (सम्पादन ✍️)</div>
                    </td>
                    {periods.map((p) => {
                      const key = `${d.key}_${p.num}`;
                      const cell = routineGrid[key];
                      const sub = subjectsData?.find((s: any) => s.id.toString() === cell?.subjectId);
                      const teach = teachersData?.find((t: any) => t.id.toString() === cell?.teacherId);
                      const cellConflict = checkConflict(d.key, p.num, cell?.teacherId);

                      return (
                        <td
                          key={p.num}
                          onClick={() => {
                            setSelectedDay(d.key);
                            setViewTab('editor');
                          }}
                          className={`p-2.5 border-r border-gray-100 text-center align-middle cursor-pointer transition ${
                            cellConflict
                              ? 'bg-red-100/70 hover:bg-red-100'
                              : sub
                              ? 'hover:bg-blue-50/60'
                              : 'hover:bg-gray-50'
                          }`}
                          title={cellConflict ? `⚠️ ${cellConflict.teacherName} ${cellConflict.className} मा व्यस्त` : 'क्लिक गरी सम्पादन गर्नुहोस्'}
                        >
                          {sub ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-gray-900">{sub.name}</div>
                              {teach && (
                                <div className={`text-[10px] font-medium ${cellConflict ? 'text-red-800 font-bold' : 'text-blue-700'}`}>
                                  {cellConflict ? `⚠️ ${teach.fullName} (${cellConflict.className})` : teach.fullName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-light">+ खाली</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
