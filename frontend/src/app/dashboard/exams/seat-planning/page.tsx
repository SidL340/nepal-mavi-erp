'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Grid,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Sparkles,
  School,
  Users,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
  Layers,
  Clock,
  Sun,
  Moon,
  RotateCcw,
  CheckSquare,
  Square,
  HelpCircle,
  Hash,
  LayoutGrid,
  Columns,
  Info,
  BadgeCheck,
  UserMinus,
  UserPlus,
  UserCheck,
  Percent,
  Filter,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ExamSeatPlanningPage() {
  const queryClient = useQueryClient();

  // Primary Selection States
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('DAY');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedRoomIdsForAllocation, setSelectedRoomIdsForAllocation] = useState<number[]>([]);

  // Excluded Student IDs state for seat planning
  const [excludedStudentIds, setExcludedStudentIds] = useState<number[]>([]);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [eligibilitySearch, setEligibilitySearch] = useState('');
  const [eligibilityClassFilter, setEligibilityClassFilter] = useState<string>('ALL');

  // Late / Walk-in student allotment modal
  const [isAllotModalOpen, setIsAllotModalOpen] = useState(false);
  const [allotStudentId, setAllotStudentId] = useState<string>('');
  const [allotRoomId, setAllotRoomId] = useState<string>('');
  const [allotBenchNo, setAllotBenchNo] = useState<string>('');
  const [allotPosition, setAllotPosition] = useState<string>('AUTO');
  const [allotSearchQuery, setAllotSearchQuery] = useState('');

  // Add Room Modal & Form
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [roomNo, setRoomNo] = useState('');
  const [building, setBuilding] = useState('Main Block');
  const [columnLayout, setColumnLayout] = useState<'2_COLUMNS' | '3_COLUMNS' | '1_COLUMN'>('2_COLUMNS');
  const [leftBenches, setLeftBenches] = useState('8');
  const [leftSeatsPerBench, setLeftSeatsPerBench] = useState('2');
  const [rightBenches, setRightBenches] = useState('8');
  const [rightSeatsPerBench, setRightSeatsPerBench] = useState('2');
  const [middleBenches, setMiddleBenches] = useState('0');
  const [middleSeatsPerBench, setMiddleSeatsPerBench] = useState('2');
  const [seatsPerBench, setSeatsPerBench] = useState('2');

  // Edit Room Modal & Form
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [editRoomNo, setEditRoomNo] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editColumnLayout, setEditColumnLayout] = useState<'2_COLUMNS' | '3_COLUMNS' | '1_COLUMN'>('2_COLUMNS');
  const [editLeftBenches, setEditLeftBenches] = useState('8');
  const [editLeftSeatsPerBench, setEditLeftSeatsPerBench] = useState('2');
  const [editRightBenches, setEditRightBenches] = useState('8');
  const [editRightSeatsPerBench, setEditRightSeatsPerBench] = useState('2');
  const [editMiddleBenches, setEditMiddleBenches] = useState('0');
  const [editMiddleSeatsPerBench, setEditMiddleSeatsPerBench] = useState('2');
  const [editSeatsPerBench, setEditSeatsPerBench] = useState('2');

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

  // Fetch Rooms
  const { data: roomsData, isLoading: isRoomsLoading } = useQuery({
    queryKey: ['exam-rooms'],
    queryFn: async () => {
      const res = await api.get('/seat-plans/rooms');
      return res.data?.data || [];
    },
  });

  const rooms: any[] = roomsData || [];

  // Auto-select all rooms for allocation by default
  useEffect(() => {
    if (rooms.length > 0 && selectedRoomIdsForAllocation.length === 0) {
      setSelectedRoomIdsForAllocation(rooms.map((r: any) => r.id));
    }
  }, [rooms]);

  // Current Exam Object
  const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);
  const examShifts = currentExam?.shifts || [];

  // Available shifts list: combines standard shifts + exam-specific shifts
  const availableShifts = useMemo(() => {
    const list = [
      {
        name: 'MORNING',
        nameNepali: 'बिहानी सत्र (Morning Shift)',
        startTime: '07:00 AM',
        endTime: '10:00 AM',
      },
      {
        name: 'DAY',
        nameNepali: 'दिवा सत्र (Day Shift)',
        startTime: '11:00 AM',
        endTime: '02:00 PM',
      },
      {
        name: 'EVENING',
        nameNepali: 'साँझ सत्र (Evening Shift)',
        startTime: '03:00 PM',
        endTime: '06:00 PM',
      },
    ];

    if (examShifts && examShifts.length > 0) {
      examShifts.forEach((s: any) => {
        const existingIdx = list.findIndex((x) => x.name === s.name);
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            nameNepali: s.nameNepali || list[existingIdx].nameNepali,
            startTime: s.startTime || list[existingIdx].startTime,
            endTime: s.endTime || list[existingIdx].endTime,
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

  // When selected exam changes, set default shift
  useEffect(() => {
    if (currentExam) {
      if (examShifts.length > 0) {
        setSelectedShift(examShifts[0].name);
      } else if (currentExam.shift) {
        setSelectedShift(currentExam.shift);
      }
    }
  }, [selectedExamId, currentExam]);

  // When shift changes, auto-select classes belonging to that shift
  useEffect(() => {
    if (!currentExam) {
      if (classesData && selectedClassIds.length === 0) {
        setSelectedClassIds(classesData.map((c: any) => c.id));
      }
      return;
    }

    if (examShifts.length > 0) {
      const matchedShift = examShifts.find((s: any) => s.name === selectedShift);
      if (matchedShift) {
        let shiftCids: number[] = [];
        try {
          shiftCids =
            typeof matchedShift.classIds === 'string'
              ? JSON.parse(matchedShift.classIds)
              : matchedShift.classIds || [];
        } catch {
          shiftCids = [];
        }
        if (shiftCids.length > 0) {
          setSelectedClassIds(shiftCids);
          return;
        }
      }
    }

    // Default to exam participating classes or all classes
    if (currentExam.examClasses?.length > 0) {
      setSelectedClassIds(currentExam.examClasses.map((ec: any) => ec.classId));
    } else if (classesData?.length > 0) {
      setSelectedClassIds(classesData.map((c: any) => c.id));
    }
  }, [selectedShift, selectedExamId, currentExam, classesData]);

  // Fetch Seat Plan for selected exam, shift, and room
  const { data: seatPlansData, isLoading: isSeatsLoading } = useQuery({
    queryKey: ['seat-plans', selectedExamId, selectedRoomId, selectedShift],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const params = new URLSearchParams();
      params.append('examId', selectedExamId);
      if (selectedShift) params.append('shift', selectedShift);
      if (selectedRoomId) params.append('roomId', selectedRoomId);
      const res = await api.get(`/seat-plans?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  const seatPlans: any[] = seatPlansData || [];

  // Fetch Students Eligibility & Attendance for selected classes
  const { data: eligibilityData, isLoading: isEligibilityLoading } = useQuery({
    queryKey: ['students-eligibility', selectedClassIds.sort().join(',')],
    queryFn: async () => {
      if (selectedClassIds.length === 0) return [];
      const res = await api.get(`/seat-plans/students-eligibility?classIds=${selectedClassIds.join(',')}`);
      return res.data?.data || [];
    },
    enabled: selectedClassIds.length > 0,
  });

  const studentsEligibility: any[] = eligibilityData || [];

  // Excluded student helpers
  const handleToggleExcludeStudent = (sId: number) => {
    setExcludedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const handleExcludeLowAttendance = (thresholdPct: number = 75) => {
    const lowAttIds = studentsEligibility
      .filter((s: any) => s.attendancePct < thresholdPct || s.status !== 'ACTIVE')
      .map((s: any) => s.studentId);
    setExcludedStudentIds(Array.from(new Set([...excludedStudentIds, ...lowAttIds])));
    toast.success(`${lowAttIds.length} जना न्यून हाजिरी (<${thresholdPct}%) वा निष्क्रिय विद्यार्थीहरूलाई सिट प्लानबाट हटाइयो!`);
  };

  const handleIncludeAllStudents = () => {
    setExcludedStudentIds([]);
    toast.success('सबै विद्यार्थीहरूलाई सिट प्लानमा समावेश गरियो!');
  };

  // Helper to parse room column configuration
  const getRoomLayoutBreakdown = (r: any) => {
    if (r.layoutConfig) {
      return {
        columnLayout: r.layoutConfig.columnLayout || '2_COLUMNS',
        leftBenches: r.layoutConfig.leftBenches || 8,
        leftSeatsPerBench: r.layoutConfig.leftSeatsPerBench || 2,
        rightBenches: r.layoutConfig.rightBenches || 8,
        rightSeatsPerBench: r.layoutConfig.rightSeatsPerBench || 2,
        middleBenches: r.layoutConfig.middleBenches || 0,
        middleSeatsPerBench: r.layoutConfig.middleSeatsPerBench || 2,
      };
    }
    const total = r.totalBenches || 16;
    const l = Math.ceil(total / 2);
    const right = total - l;
    return {
      columnLayout: '2_COLUMNS',
      leftBenches: l,
      leftSeatsPerBench: r.seatsPerBench || 2,
      rightBenches: right,
      rightSeatsPerBench: r.seatsPerBench || 2,
      middleBenches: 0,
      middleSeatsPerBench: 2,
    };
  };

  // Create Room Mutation
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!roomNo.trim()) throw new Error('Please enter Room Number/Name.');
      const l = parseInt(leftBenches) || 0;
      const lSpb = parseInt(leftSeatsPerBench) || 2;
      const r = parseInt(rightBenches) || 0;
      const rSpb = parseInt(rightSeatsPerBench) || 2;
      const m = columnLayout === '3_COLUMNS' ? parseInt(middleBenches) || 0 : 0;
      const mSpb = parseInt(middleSeatsPerBench) || 2;
      const computedTotalBenches = l + r + m || 16;

      const res = await api.post('/seat-plans/rooms', {
        roomNo: roomNo.trim(),
        building: building.trim(),
        columnLayout,
        leftBenches: l,
        leftSeatsPerBench: lSpb,
        rightBenches: r,
        rightSeatsPerBench: rSpb,
        middleBenches: m,
        middleSeatsPerBench: mSpb,
        totalBenches: computedTotalBenches,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Exam Room created successfully!');
      setRoomNo('');
      setIsAddRoomModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create room');
    },
  });

  // Update Room Mutation
  const updateRoomMutation = useMutation({
    mutationFn: async () => {
      if (!editingRoom) return;
      if (!editRoomNo.trim()) throw new Error('Please enter Room Number/Name.');
      const l = parseInt(editLeftBenches) || 0;
      const lSpb = parseInt(editLeftSeatsPerBench) || 2;
      const r = parseInt(editRightBenches) || 0;
      const rSpb = parseInt(editRightSeatsPerBench) || 2;
      const m = editColumnLayout === '3_COLUMNS' ? parseInt(editMiddleBenches) || 0 : 0;
      const mSpb = parseInt(editMiddleSeatsPerBench) || 2;
      const computedTotalBenches = l + r + m || 16;

      const res = await api.put(`/seat-plans/rooms/${editingRoom.id}`, {
        roomNo: editRoomNo.trim(),
        building: editBuilding.trim(),
        columnLayout: editColumnLayout,
        leftBenches: l,
        leftSeatsPerBench: lSpb,
        rightBenches: r,
        rightSeatsPerBench: rSpb,
        middleBenches: m,
        middleSeatsPerBench: mSpb,
        totalBenches: computedTotalBenches,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Room updated successfully!');
      setIsEditRoomModalOpen(false);
      setEditingRoom(null);
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update room');
    },
  });

  const openEditRoomModal = (r: any) => {
    setEditingRoom(r);
    setEditRoomNo(r.roomNo || '');
    setEditBuilding(r.building || '');
    const breakdown = getRoomLayoutBreakdown(r);
    setEditLeftBenches(String(breakdown.leftBenches));
    setEditLeftSeatsPerBench(String(breakdown.leftSeatsPerBench || 2));
    setEditRightBenches(String(breakdown.rightBenches));
    setEditRightSeatsPerBench(String(breakdown.rightSeatsPerBench || 2));
    setEditMiddleBenches(String(breakdown.middleBenches || 0));
    setEditMiddleSeatsPerBench(String(breakdown.middleSeatsPerBench || 2));
    setEditColumnLayout(breakdown.columnLayout || '2_COLUMNS');
    setIsEditRoomModalOpen(true);
  };

  // Delete Room Mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/seat-plans/rooms/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Room deleted');
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete room');
    },
  });

  // Seed Default Rooms Mutation
  const seedRoomsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/seat-plans/rooms/seed-default');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Standard exam rooms seeded!');
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to seed rooms');
    },
  });

  // Auto Generate Seat Plan Mutation (With Excluded Students Support)
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || selectedClassIds.length === 0) {
        throw new Error('Please select an Exam and at least one Class');
      }
      const targetRoomIds =
        selectedRoomIdsForAllocation.length > 0
          ? selectedRoomIdsForAllocation
          : rooms.map((r: any) => r.id);

      if (targetRoomIds.length === 0) {
        throw new Error('Please add at least one Exam Room first in Step 1');
      }

      const res = await api.post('/seat-plans/auto-generate', {
        examId: parseInt(selectedExamId),
        shift: selectedShift || 'DAY',
        roomIds: targetRoomIds,
        classIds: selectedClassIds,
        excludedStudentIds,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Smart seat allocation complete for ${selectedShift} shift!`);
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate seat plan');
    },
  });

  // Late / Manual Allot Student Mutation
  const allotStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !allotStudentId) {
        throw new Error('Please select an Exam and a Student.');
      }
      const res = await api.post('/seat-plans/allot-student', {
        examId: parseInt(selectedExamId),
        shift: selectedShift || 'DAY',
        studentId: parseInt(allotStudentId),
        roomId: allotRoomId ? parseInt(allotRoomId) : undefined,
        benchNo: allotBenchNo ? parseInt(allotBenchNo) : undefined,
        seatPosition: allotPosition !== 'AUTO' ? allotPosition : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Student seated successfully!');
      setIsAllotModalOpen(false);
      if (allotStudentId) {
        setExcludedStudentIds((prev) => prev.filter((id) => id !== parseInt(allotStudentId)));
      }
      setAllotStudentId('');
      setAllotRoomId('');
      setAllotBenchNo('');
      setAllotPosition('AUTO');
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to allot seat');
    },
  });

  // Remove Single Seat Allocation Mutation
  const removeSeatMutation = useMutation({
    mutationFn: async (seatId: number) => {
      const res = await api.delete(`/seat-plans/seat/${seatId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('सिट आवंटन हटाइयो!');
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove seat');
    },
  });

  // Clear Seat Plan Mutation
  const clearShiftSeatPlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) return;
      const res = await api.delete(
        `/seat-plans/exam/${selectedExamId}?shift=${encodeURIComponent(selectedShift)}`
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Cleared seat plan for ${selectedShift} shift.`);
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to clear seat plan');
    },
  });

  const handleToggleClass = (cid: number) => {
    setSelectedClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const handleSelectAllClasses = () => {
    if (classesData) {
      if (selectedClassIds.length === classesData.length) {
        setSelectedClassIds([]);
      } else {
        setSelectedClassIds(classesData.map((c: any) => c.id));
      }
    }
  };

  const handleToggleRoomForAllocation = (rid: number) => {
    setSelectedRoomIdsForAllocation((prev) =>
      prev.includes(rid) ? prev.filter((id) => id !== rid) : [...prev, rid]
    );
  };

  const handleSelectAllRooms = () => {
    if (selectedRoomIdsForAllocation.length === rooms.length) {
      setSelectedRoomIdsForAllocation([]);
    } else {
      setSelectedRoomIdsForAllocation(rooms.map((r: any) => r.id));
    }
  };

  // Group seat plans by room for physical classroom view
  const seatPlansByRoom = useMemo(() => {
    const map: Record<string, { room: any; seats: any[]; benches: Record<number, any[]> }> = {};

    seatPlans.forEach((s: any) => {
      const rId = s.roomId;
      if (!map[rId]) {
        map[rId] = {
          room: s.room,
          seats: [],
          benches: {},
        };
      }
      map[rId].seats.push(s);
      if (!map[rId].benches[s.benchNo]) {
        map[rId].benches[s.benchNo] = [];
      }
      map[rId].benches[s.benchNo].push(s);
    });

    return map;
  }, [seatPlans]);

  // Distinct class badge colors for anti-cheating visualization
  const getClassBadgeColor = (className: string) => {
    const colors = [
      'bg-blue-100 text-blue-900 border-blue-300',
      'bg-purple-100 text-purple-900 border-purple-300',
      'bg-emerald-100 text-emerald-900 border-emerald-300',
      'bg-amber-100 text-amber-900 border-amber-300',
      'bg-rose-100 text-rose-900 border-rose-300',
      'bg-cyan-100 text-cyan-900 border-cyan-300',
      'bg-indigo-100 text-indigo-900 border-indigo-300',
      'bg-teal-100 text-teal-900 border-teal-300',
    ];
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  // Print Door Notice (ढोका सूचना / Exam Hall Door Notice)
  const printDoorNotice = (targetRoomId?: number | string) => {
    if (seatPlans.length === 0) {
      toast.error('No seat plan to print. Please generate seats first.');
      return;
    }

    const roomsToPrint = targetRoomId
      ? Object.values(seatPlansByRoom).filter((r) => String(r.room?.id) === String(targetRoomId))
      : Object.values(seatPlansByRoom);

    if (roomsToPrint.length === 0) {
      toast.error('No seat plans found for the selected room.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? `${currentExam.name} (${currentExam.nameNepali || ''})` : 'Examination';
    const shiftInfo = availableShifts.find((s) => s.name === selectedShift);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Door Notice - ${examTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; margin: 0; padding: 0; color: #111; line-height: 1.3; }
          .header { text-align: center; border-bottom: 2.5px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 8px; }
          .school-title { font-size: 16px; font-weight: 900; color: #1e3a5f; letter-spacing: 0.5px; text-transform: uppercase; }
          .school-subtitle { font-size: 11px; color: #475569; font-weight: 600; margin-top: 1px; }
          .notice-badge { display: inline-block; background: #1e3a5f; color: #fff; font-size: 12px; font-weight: 800; padding: 3px 14px; border-radius: 20px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin-top: 8px; font-size: 11px; }
          .room-hero { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 6px; padding: 8px 12px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
          .room-title { font-size: 18px; font-weight: 900; color: #1e3a5f; }
          .room-subtitle { font-size: 11px; font-weight: bold; color: #1d4ed8; margin-top: 2px; }
          .class-summary-box { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; }
          .class-summary-chip { background: #fff; border: 1px solid #f59e0b; color: #92400e; font-weight: 800; font-size: 10.5px; padding: 2px 8px; border-radius: 4px; }
          .room-card { page-break-after: always; margin-bottom: 20px; }
          .room-card:last-child { page-break-after: auto; }
          .section-title { font-size: 11px; font-weight: 800; color: #1e3a5f; margin: 10px 0 4px 0; border-left: 3.5px solid #1e3a5f; padding-left: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: middle; }
          th { background: #f1f5f9; font-weight: 800; color: #0f172a; font-size: 9.5px; }
          .seat-badge { font-weight: 900; font-family: monospace; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a; font-size: 11px; white-space: nowrap; display: inline-block; }
          .bench-badge { font-weight: 800; font-family: monospace; color: #0f172a; }
          .student-name { font-weight: 800; color: #0f172a; font-size: 10.5px; }
          .class-tag { font-weight: 800; color: #1e3a5f; background: #e0f2fe; padding: 1.5px 5px; border-radius: 3px; font-size: 9.5px; border: 1px solid #bae6fd; }
          .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
          .column-title { text-align: center; background: #e2e8f0; font-weight: 800; padding: 3px; font-size: 10px; border-radius: 3px; margin-bottom: 3px; color: #1e293b; }
          .footer-signs { display: flex; justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1px dashed #94a3b8; font-size: 10px; font-weight: 800; color: #334155; }
        </style>
      </head>
      <body>
    `;

    roomsToPrint.forEach(({ room, seats, benches }) => {
      // Sort seats sequentially by bench and position
      const sortedSeats = [...seats].sort((a, b) => {
        if (a.benchNo !== b.benchNo) return a.benchNo - b.benchNo;
        return (a.seatPosition || '').localeCompare(b.seatPosition || '');
      });

      // Compute class summary for this room
      const classMap: Record<string, { className: string; rolls: number[]; count: number }> = {};
      sortedSeats.forEach((s) => {
        const cName = s.student?.classEnrollment?.[0]?.class?.name || `Class ${s.classId}`;
        if (!classMap[cName]) {
          classMap[cName] = { className: cName, rolls: [], count: 0 };
        }
        classMap[cName].count++;
        if (s.rollNo) classMap[cName].rolls.push(Number(s.rollNo));
      });

      const benchKeys = Object.keys(benches).map(Number).sort((a, b) => a - b);
      const half = Math.ceil(benchKeys.length / 2);
      const leftBenchKeys = benchKeys.slice(0, half);
      const rightBenchKeys = benchKeys.slice(half);

      html += `
        <div class="room-card">
          <div class="header">
            <div class="school-title">श्री नेपाल माध्यमिक विद्यालय (NEPAL SECONDARY SCHOOL)</div>
            <div class="school-subtitle">परीक्षा नियन्त्रण शाखा &bull; Examination Control Division</div>
            <div><span class="notice-badge">📋 परीक्षा कोठा ढोका सिट सूचना (EXAM ROOM DOOR NOTICE)</span></div>
          </div>

          <div class="room-hero">
            <div>
              <div class="room-title">🏢 परीक्षा कोठा: ${room.roomNo}</div>
              <div class="room-subtitle">भवन / ब्लक: ${room.building || 'Main Block'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 900; color: #1e3a5f;">कुल परीक्षार्थी: ${seats.length} जना</div>
              <div style="font-size: 10.5px; color: #475569; font-weight: 700;">कुल डेस्क/बेन्च: ${benchKeys.length} वटा</div>
            </div>
          </div>

          <div class="meta-bar">
            <div><strong>📝 परीक्षा (Exam):</strong> ${examTitle}</div>
            <div><strong>⏰ सत्र (Shift):</strong> ${shiftInfo?.nameNepali || selectedShift} (${shiftInfo?.startTime || ''} - ${shiftInfo?.endTime || ''})</div>
          </div>

          <div class="class-summary-box">
            <span style="font-weight: 900; color: #b45309; font-size: 10.5px; display: flex; align-items: center;">🏷️ कोठामा समावेश कक्षाहरू:</span>
            ${Object.values(classMap).map((cm) => {
              const minRoll = cm.rolls.length > 0 ? Math.min(...cm.rolls) : '-';
              const maxRoll = cm.rolls.length > 0 ? Math.max(...cm.rolls) : '-';
              const rollRange = minRoll === maxRoll ? `Roll #${minRoll}` : `Roll #${minRoll} – #${maxRoll}`;
              return `<span class="class-summary-chip">${cm.className}: ${rollRange} (${cm.count} जना)</span>`;
            }).join(' ')}
          </div>

          <div class="section-title">📋 १ देखि अन्तिम सिट सम्मको क्रमिक नामावली (Sequential Seating Directory)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 13%; text-align: center;">सिट नं. (Seat No)</th>
                <th style="width: 13%; text-align: center;">डेस्क/बेन्च</th>
                <th style="width: 9%; text-align: center;">स्थान</th>
                <th style="width: 25%;">परीक्षार्थीको नाम (Student Name)</th>
                <th style="width: 14%;">कक्षा (Class)</th>
                <th style="width: 8%; text-align: center;">रोल नं.</th>
                <th style="width: 10%; text-align: center;">दर्ता / EMIS</th>
                <th style="width: 8%; text-align: center;">उपस्थिति</th>
              </tr>
            </thead>
            <tbody>
              ${sortedSeats.map((s: any, idx: number) => {
                const displaySeatNo = s.seatNo || `Seat ${String(idx + 1).padStart(2, '0')}`;
                return `
                  <tr>
                    <td style="text-align: center;"><span class="seat-badge">🪑 ${displaySeatNo}</span></td>
                    <td style="text-align: center;" class="bench-badge">Bench #${s.benchNo}</td>
                    <td style="text-align: center; font-size: 9px; font-weight: 800; color: #475569;">${s.seatPosition}</td>
                    <td class="student-name">${s.student?.fullName || '—'}</td>
                    <td><span class="class-tag">${s.student?.classEnrollment?.[0]?.class?.name || 'Class ' + s.classId}</span></td>
                    <td style="text-align: center; font-weight: 900; font-family: monospace;">#${s.rollNo || '-'}</td>
                    <td style="text-align: center; font-family: monospace; font-size: 9px;">${s.student?.emisId || s.student?.studentId || '-'}</td>
                    <td style="text-align: center; font-size: 9px; color: #94a3b8;">[ &nbsp; ]</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="section-title">🗺️ कोठाको भौतिक डेस्क नक्सा (Classroom Desk Seating Layout)</div>
          <div class="grid-container">
            <div>
              <div class="column-title">⬅️ बायाँ लहर (LEFT ROW DESKS)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 18%; text-align: center;">Bench</th>
                    <th style="width: 82%;">सिट तथा परीक्षार्थी विवरण (Seated Students)</th>
                  </tr>
                </thead>
                <tbody>
                  ${leftBenchKeys.map((bNo) => {
                    const bSeats = benches[bNo] || [];
                    return `
                      <tr>
                        <td class="bench-badge" style="text-align:center;">B-${bNo}</td>
                        <td>
                          <div style="display:flex; flex-wrap:wrap; gap:3px;">
                            ${bSeats.length > 0 ? bSeats.map((s: any) => `
                              <div style="flex:1 1 calc(50% - 4px); min-width:90px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:3px; padding:2px 4px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                  <span class="seat-badge" style="font-size:8.5px; padding:0.5px 3px;">${s.seatNo || 'Seat'}</span>
                                  <span style="font-size:8px; font-weight:800; color:#1e3a5f;">${s.seatPosition}</span>
                                </div>
                                <div class="student-name" style="font-size:9.5px; margin-top:1px;">${s.student?.fullName}</div>
                                <div style="font-size:8.5px; color:#475569;">${s.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: #${s.rollNo || '-'})</div>
                              </div>
                            `).join('') : '<span style="color:#999; font-style:italic;">खाली बेन्च</span>'}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div>
              <div class="column-title">➡️ दायाँ लहर (RIGHT ROW DESKS)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 18%; text-align: center;">Bench</th>
                    <th style="width: 82%;">सिट तथा परीक्षार्थी विवरण (Seated Students)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rightBenchKeys.map((bNo) => {
                    const bSeats = benches[bNo] || [];
                    return `
                      <tr>
                        <td class="bench-badge" style="text-align:center;">B-${bNo}</td>
                        <td>
                          <div style="display:flex; flex-wrap:wrap; gap:3px;">
                            ${bSeats.length > 0 ? bSeats.map((s: any) => `
                              <div style="flex:1 1 calc(50% - 4px); min-width:90px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:3px; padding:2px 4px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                  <span class="seat-badge" style="font-size:8.5px; padding:0.5px 3px;">${s.seatNo || 'Seat'}</span>
                                  <span style="font-size:8px; font-weight:800; color:#1e3a5f;">${s.seatPosition}</span>
                                </div>
                                <div class="student-name" style="font-size:9.5px; margin-top:1px;">${s.student?.fullName}</div>
                                <div style="font-size:8.5px; color:#475569;">${s.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: #${s.rollNo || '-'})</div>
                              </div>
                            `).join('') : '<span style="color:#999; font-style:italic;">खाली बेन्च</span>'}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer-signs">
            <div>____________________________<br/>निरीक्षकको दस्तखत (Invigilator Sign)</div>
            <div>____________________________<br/>केन्द्राध्यक्ष / परीक्षा शाखा (Exam In-charge)</div>
            <div>____________________________<br/>प्रधानाध्यापक (Headmaster / Principal)</div>
          </div>
        </div>
      `;
    });

    html += `
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print Desk Slips / Desk Stickers (डेस्कमा टाँस्ने सिट स्टिकर/स्लिपहरू)
  const printDeskSlips = (targetRoomId?: number | string) => {
    if (seatPlans.length === 0) {
      toast.error('No seat plan to print.');
      return;
    }

    const plansToPrint = targetRoomId
      ? seatPlans.filter((s) => String(s.roomId) === String(targetRoomId))
      : seatPlans;

    if (plansToPrint.length === 0) {
      toast.error('No seat plans found for the selected room.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? `${currentExam.name} (${currentExam.nameNepali || ''})` : 'Examination';
    const shiftInfo = availableShifts.find((s) => s.name === selectedShift);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Desk Stickers - ${examTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #111; }
          .slips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
          .slip-card {
            border: 2px dashed #475569;
            border-radius: 8px;
            padding: 9px 12px;
            box-sizing: border-box;
            background: #fff;
            position: relative;
            page-break-inside: avoid;
          }
          .school-header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px; margin-bottom: 5px; }
          .school-name { font-weight: 900; font-size: 11px; color: #1e3a5f; letter-spacing: 0.5px; text-transform: uppercase; }
          .exam-name { font-size: 9px; font-weight: 700; color: #475569; margin-top: 1px; }
          .seat-hero { background: #fef3c7; border: 1.5px solid #fde68a; border-radius: 6px; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
          .seat-number-big { font-size: 18px; font-weight: 900; color: #92400e; font-family: monospace; }
          .room-bench-info { text-align: right; font-size: 10px; font-weight: 800; color: #1e3a5f; }
          .candidate-details { font-size: 10.5px; margin-top: 3px; line-height: 1.35; }
          .candidate-name { font-size: 13px; font-weight: 900; color: #0f172a; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 3px; font-size: 9.5px; }
          .meta-item { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
          .cut-guide { text-align: right; font-size: 7.5px; color: #94a3b8; margin-top: 4px; font-style: italic; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="slips-grid">
    `;

    // Sort seat plans room-wise and bench-wise
    const sortedPlans = [...plansToPrint].sort((a, b) => {
      if (a.roomId !== b.roomId) return a.roomId - b.roomId;
      if (a.benchNo !== b.benchNo) return a.benchNo - b.benchNo;
      return (a.seatPosition || '').localeCompare(b.seatPosition || '');
    });

    sortedPlans.forEach((seat: any, idx: number) => {
      const displaySeatNo = seat.seatNo || `Seat ${String(idx + 1).padStart(2, '0')}`;
      html += `
        <div class="slip-card">
          <div class="school-header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय (NEPAL SECONDARY SCHOOL)</div>
            <div class="exam-name">${examTitle} &bull; ${shiftInfo?.nameNepali || selectedShift}</div>
          </div>
          
          <div class="seat-hero">
            <div>
              <div style="font-size: 8px; font-weight: 900; color: #b45309; text-transform: uppercase;">EXAM SEAT NO (सिट नं.)</div>
              <div class="seat-number-big">🪑 ${displaySeatNo}</div>
            </div>
            <div class="room-bench-info">
              <div>🏢 Room: <strong>${seat.room?.roomNo || 'Room'}</strong></div>
              <div style="color: #475569; font-size: 9px; font-weight: 700;">Bench #${seat.benchNo} (${seat.seatPosition})</div>
            </div>
          </div>

          <div class="candidate-details">
            <div class="candidate-name">${seat.student?.fullName || 'Student'}</div>
            <div class="meta-grid">
              <div class="meta-item"><strong>कक्षा:</strong> ${seat.student?.classEnrollment?.[0]?.class?.name || 'Class ' + seat.classId}</div>
              <div class="meta-item"><strong>रोल नं:</strong> #${seat.rollNo || '—'}</div>
              <div class="meta-item" style="grid-column: span 2;"><strong>दर्ता / सिम्बोल नं:</strong> ${seat.student?.emisId || seat.student?.studentId || '—'}</div>
            </div>
          </div>
          <div class="cut-guide">✂️ डेस्कमा टाँस्नका लागि यहाँबाट काट्नुहोस् (Cut & Tape to Desk)</div>
        </div>
      `;
    });

    html += `
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── TOP HEADER BAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/exams"
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
              title="Back to Exams"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl font-black text-[#1e3a5f] flex items-center gap-2">
              <Grid className="text-blue-600" size={24} />
              <span>Anti-Cheating Exam Seat Planning (परीक्षा सिट योजना)</span>
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-nepali mt-1">
            कोठा क्षमता, बेन्च व्यवस्थापन, फरक कक्षाका विद्यार्थीहरूलाई एकान्तर (Interleaved) सिट प्लान र ढोका सूचना
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/exams/admit-cards"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 text-xs font-bold text-purple-900 transition shadow-2xs"
          >
            <Users size={14} />
            <span>Admit Cards (प्रवेश पत्र)</span>
          </Link>

          <button
            type="button"
            onClick={() => printDoorNotice()}
            disabled={seatPlans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
            title="सबै परीक्षा कोठाहरूको ढोका सूचना प्रिन्ट गर्नुहोस्"
          >
            <Printer size={14} className="text-blue-600" />
            <span>Print All Door Notices (ढोका टाँस)</span>
          </button>

          <button
            type="button"
            onClick={() => printDeskSlips()}
            disabled={seatPlans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
            title="सबै परीक्षार्थीहरूको डेस्कमा टाँस्ने सिट स्लिपहरू प्रिन्ट गर्नुहोस्"
          >
            <Printer size={14} className="text-purple-600" />
            <span>Print All Desk Slips (डेस्क स्लिपहरू)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddRoomModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-4 py-2 text-xs font-bold text-white transition shadow-xs"
          >
            <Plus size={14} />
            <span>Add Exam Room (कोठा थप्नुहोस्)</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── STEP 1: ROOM & DESK STRUCTURE CONFIGURATION ─────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center">
              १
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Building size={14} className="text-blue-600" />
                <span>STEP 1: Exam Rooms & Physical Desk Layout (कोठा तथा बेन्च संरचना)</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-nepali">
                प्रत्येक कोठामा बायाँ र दायाँ लहर (Left/Right Rows) का बेन्चहरू र प्रति बेन्च सिट क्षमता
              </p>
            </div>
          </div>

          {rooms.length === 0 && (
            <button
              onClick={() => seedRoomsMutation.mutate()}
              disabled={seedRoomsMutation.isPending}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>{seedRoomsMutation.isPending ? 'Seeding...' : 'Auto-Seed Standard Rooms'}</span>
            </button>
          )}
        </div>

        {/* Existing Room Cards with Edit & Delete */}
        {isRoomsLoading ? (
          <div className="py-6 text-center text-gray-400 text-xs">Loading examination rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-2">
            <School className="mx-auto text-gray-300" size={32} />
            <p className="text-xs font-bold text-gray-700">No Exam Rooms Configured Yet</p>
            <p className="text-[11px] text-gray-400">
              Click &quot;Add Exam Room&quot; or &quot;Auto-Seed Standard Rooms&quot; to configure your school&apos;s exam halls.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rooms.map((r: any) => {
              const breakdown = getRoomLayoutBreakdown(r);
              const isSelectedForAllocation = selectedRoomIdsForAllocation.includes(r.id);

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-3.5 text-xs space-y-2 transition relative group ${
                    isSelectedForAllocation
                      ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                      : 'border-gray-200 bg-white opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isSelectedForAllocation}
                        onChange={() => handleToggleRoomForAllocation(r.id)}
                        className="rounded text-blue-600 h-3.5 w-3.5 cursor-pointer"
                        title="Include room in seat allocation"
                      />
                      <strong className="text-gray-900 font-black text-sm">{r.roomNo}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditRoomModal(r)}
                        title="Edit Room Layout"
                        className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete ${r.roomNo}? This will also remove any seat allocations linked to this room.`
                            )
                          ) {
                            deleteRoomMutation.mutate(r.id);
                          }
                        }}
                        title="Delete Room"
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 truncate">{r.building || 'Main Block'}</p>

                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60 space-y-1 font-mono text-[10.5px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>📐 Layout:</span>
                      <span className="font-bold text-slate-800">
                        Left: {breakdown.leftBenches} | Right: {breakdown.rightBenches}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold border-t border-slate-200/50 pt-1">
                      <span className="text-gray-600">{r.totalBenches} Benches</span>
                      <span className="text-blue-700">{r.totalCapacity || r.totalBenches * 2} Seats</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── STEP 2: CHOOSE EXAM, SHIFT & SMART ALLOCATION ──────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border-2 border-purple-200/80 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-purple-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
              २
            </div>
            <div>
              <h2 className="text-sm font-black text-purple-950 flex items-center gap-2 uppercase tracking-wide">
                <Sparkles size={16} className="text-purple-700" />
                <span>STEP 2: Choose Exam, Shift & Classes (परीक्षा, सत्र तथा कक्षा छनौट)</span>
              </h2>
              <p className="text-[11px] text-purple-800 font-nepali">
                कुन परीक्षा र कुन सत्र (बिहानी वा दिवा) का लागि सिट योजना बनाउने हो चयन गर्नुहोस्
              </p>
            </div>
          </div>

          {seatPlans.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to clear seat plan for ${selectedShift} shift?`)) {
                  clearShiftSeatPlanMutation.mutate();
                }
              }}
              disabled={clearShiftSeatPlanMutation.isPending}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
            >
              <RotateCcw size={12} />
              <span>Reset {selectedShift} Plan</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Exam Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Examination *:</label>
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

          {/* Room Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Filter Layout View by Room:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="erp-input font-medium"
            >
              <option value="">All Exam Rooms (सबै कोठा एकमुष्ट)</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.roomNo} ({r.totalBenches} benches, {r.totalCapacity || r.totalBenches * 2} capacity)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Shift Selector Cards (Always Visible) ── */}
        <div className="space-y-2 pt-2 border-t border-purple-100">
          <label className="block font-bold text-gray-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-purple-700" />
              <span>Choose Exam Shift to Plan (सत्र छनौट):</span>
            </span>
            <span className="text-[11px] text-gray-500 font-normal">
              बिहानी र दिवा सत्रका लागि अलग-अलग सिट प्लान स्वतः सुरक्षित हुन्छ।
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {availableShifts.map((sh: any) => {
              const isSelected = selectedShift === sh.name;
              const isMorning = (sh.name || '').toUpperCase().includes('MORN');
              const isEvening = (sh.name || '').toUpperCase().includes('EVEN');

              return (
                <button
                  key={sh.name}
                  type="button"
                  onClick={() => setSelectedShift(sh.name)}
                  className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition border text-left ${
                    isSelected
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-md ring-2 ring-purple-400 scale-[1.01]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isMorning
                          ? 'bg-amber-100 text-amber-700'
                          : isEvening
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isMorning ? <Sun size={16} /> : isEvening ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <div>
                      <span className="block font-bold text-xs">{sh.nameNepali}</span>
                      <span
                        className={`text-[10.5px] font-mono ${
                          isSelected ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {sh.startTime} - {sh.endTime}
                      </span>
                    </div>
                  </div>

                  {isSelected && <BadgeCheck size={18} className="text-amber-300 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Classes to Interleave */}
        <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-700">
              Select Classes in {selectedShift} Shift to Interleave (यस शिफ्टमा मिलाउने कक्षाहरू):
            </label>
            <button
              type="button"
              onClick={handleSelectAllClasses}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              {selectedClassIds.length === classesData?.length ? 'Deselect All' : 'Select All Classes'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {classesData?.map((cls: any) => {
              const isSelected = selectedClassIds.includes(cls.id);
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => handleToggleClass(cls.id)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition text-left ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare size={14} className="text-purple-600 shrink-0" />
                  ) : (
                    <Square size={14} className="text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">{cls.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Student Eligibility & Attendance Filter Section ─── */}
        {selectedClassIds.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-blue-700" />
                <span className="font-extrabold text-xs text-[#1e3a5f]">
                  Student Eligibility & Attendance Filter (परीक्षा सहभागी विद्यार्थी छनौट / न्यून हाजिरी विद्यार्थी हटाउने)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEligibilityModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition"
              >
                <Filter size={13} />
                <span>Review / Filter Students ({studentsEligibility.length - excludedStudentIds.length}/{studentsEligibility.length} Included)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <Users size={14} className="text-blue-600" />
                  <span>Total in Shift Classes: <strong className="text-gray-900">{studentsEligibility.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  <UserCheck size={14} />
                  <span>Eligible for Seat: <strong className="text-emerald-900">{studentsEligibility.length - excludedStudentIds.length}</strong></span>
                </div>
                {excludedStudentIds.length > 0 && (
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    <UserMinus size={14} />
                    <span>Excluded (सिट नतोकिने): <strong className="text-rose-900">{excludedStudentIds.length}</strong></span>
                  </div>
                )}
              </div>

              {/* Quick Exclusion Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExcludeLowAttendance(75)}
                  className="rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 text-[11px] font-bold border border-amber-300 transition"
                  title="Exclude students whose attendance is below 75%"
                >
                  Exclude Attendance &lt; 75%
                </button>
                <button
                  type="button"
                  onClick={() => handleExcludeLowAttendance(60)}
                  className="rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 text-[11px] font-bold border border-amber-300 transition"
                  title="Exclude students whose attendance is below 60%"
                >
                  &lt; 60%
                </button>
                {excludedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleIncludeAllStudents}
                    className="rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2.5 py-1 text-[11px] font-bold border border-emerald-300 transition"
                  >
                    Include All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Choose Exam Rooms / Halls for Allocation (Multi-Select Checkboxes) ─── */}
        <div className="space-y-3 pt-3 border-t border-purple-100 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="font-extrabold text-gray-800 text-xs flex items-center gap-1.5">
                <Building size={15} className="text-purple-700" />
                <span>Select Exam Rooms / Halls for Allocation (सिट निर्धारणका लागि प्रयोग हुने कोठा/हलहरू):</span>
              </label>
              <span className="text-[11px] text-gray-500 font-normal">
                छानिएका कोठाहरूमा मात्र यस सत्रका विद्यार्थीहरूको सिट बाँडफाँड गरिनेछ।
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                {selectedRoomIdsForAllocation.length} / {rooms.length} Rooms Selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllRooms}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                {selectedRoomIdsForAllocation.length === rooms.length ? 'Deselect All' : 'Select All Rooms'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {rooms.map((r: any) => {
              const breakdown = getRoomLayoutBreakdown(r);
              const isSelected = selectedRoomIdsForAllocation.includes(r.id);

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleToggleRoomForAllocation(r.id)}
                  className={`flex flex-col justify-between p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-2xs ring-1 ring-purple-400'
                      : 'border-gray-200 bg-slate-50/50 text-gray-600 hover:bg-slate-100/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-purple-700 shrink-0 mt-0.5" />
                      ) : (
                        <Square size={16} className="text-gray-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="font-extrabold text-sm block text-gray-900">
                          {r.roomNo}
                        </strong>
                        <span className="text-[10px] text-gray-500 font-medium block">
                          {r.building || 'Main Block'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded-md bg-white border border-purple-200 text-purple-900 shadow-2xs">
                      {r.totalCapacity || r.totalBenches * 2} सिट
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-purple-200/50 w-full space-y-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>⬅️ Left:</span>
                      <span className="font-bold text-gray-800">
                        {breakdown.leftBenches} benches ({breakdown.leftSeatsPerBench}/desk)
                      </span>
                    </div>
                    {breakdown.columnLayout === '3_COLUMNS' && breakdown.middleBenches > 0 && (
                      <div className="flex items-center justify-between text-gray-600">
                        <span>↔️ Middle:</span>
                        <span className="font-bold text-gray-800">
                          {breakdown.middleBenches} benches ({breakdown.middleSeatsPerBench}/desk)
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-gray-600">
                      <span>➡️ Right:</span>
                      <span className="font-bold text-gray-800">
                        {breakdown.rightBenches} benches ({breakdown.rightSeatsPerBench}/desk)
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Capacity Validation & Live Stats */}
          {rooms.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="font-bold text-gray-700">
                  कुल छानिएका कोठाहरूको सिट क्षमता (Total Available Seats):{' '}
                  <strong className="text-purple-900 font-mono text-sm font-black">
                    {rooms
                      .filter((r: any) => selectedRoomIdsForAllocation.includes(r.id))
                      .reduce((sum: number, r: any) => sum + (r.totalCapacity || r.totalBenches * 2), 0)}{' '}
                    Seats
                  </strong>
                </div>
                <div className="font-bold text-gray-700">
                  सिट आवश्यक पर्ने कुल विद्यार्थी (Students to Seat):{' '}
                  <strong className="text-blue-900 font-mono text-sm font-black">
                    {studentsEligibility.length - excludedStudentIds.length} Students
                  </strong>
                </div>
              </div>

              <div>
                {rooms
                  .filter((r: any) => selectedRoomIdsForAllocation.includes(r.id))
                  .reduce((sum: number, r: any) => sum + (r.totalCapacity || r.totalBenches * 2), 0) >=
                (studentsEligibility.length - excludedStudentIds.length) ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl text-[11px]">
                    <CheckCircle2 size={13} />
                    <span>क्षमता पर्याप्त छ (Sufficient Capacity)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-xl text-[11px]">
                    <AlertTriangle size={13} />
                    <span>क्षमता अपुग (कृपया थप कोठा छनौट गर्नुहोस्)</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-purple-100">
          <p className="text-[11px] text-gray-500 font-nepali">
            💡 &quot;Smart Auto-Allocate&quot; ले फरक-फरक कक्षाका विद्यार्थीहरूलाई एकापसमा मिलाएर (Interleaving) नक्कल रोक्ने गरी सिट निर्धारण गर्दछ।
          </p>

          <button
            type="button"
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending || !selectedExamId || selectedClassIds.length === 0 || selectedRoomIdsForAllocation.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 px-6 py-3 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
          >
            <Sparkles size={16} className="text-amber-300" />
            <span>
              {autoGenerateMutation.isPending
                ? 'Allocating Seats...'
                : `Generate Smart ${selectedShift} Seat Plan`}
            </span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── STEP 3: PHYSICAL CLASSROOM LAYOUT VIEW & SEAT PLAN ─────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Columns className="text-blue-600" size={18} />
              <span>Realistic Physical Classroom Layout (भौतिक कक्षा कोठा सिट संरचना)</span>
            </h2>
            <p className="text-xs text-gray-500">
              Active Shift: <strong className="text-purple-900">{selectedShift} Shift</strong> &bull; Total Seated Students: <strong>{seatPlans.length}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (!selectedExamId) {
                  toast.error('Please select an exam first');
                  return;
                }
                setIsAllotModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserPlus size={14} />
              <span>➕ Allot Late Student (विद्यार्थी थप्नुहोस्)</span>
            </button>

            {seatPlans.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => printDoorNotice()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95"
                  title="सबै कोठाहरूको ढोका सूचना प्रिन्ट गर्नुहोस्"
                >
                  <Printer size={14} className="text-amber-300" />
                  <span>Print All Door Notices (ढोका सूचना)</span>
                </button>

                <button
                  type="button"
                  onClick={() => printDeskSlips()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95"
                  title="सबै परीक्षार्थीहरूको डेस्कमा टाँस्ने सिट स्लिपहरू प्रिन्ट गर्नुहोस्"
                >
                  <Printer size={14} className="text-cyan-200" />
                  <span>Print All Desk Slips (डेस्क स्लिपहरू)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isSeatsLoading ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-100 p-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2 text-xs">Loading seat plans for {selectedShift} shift...</p>
          </div>
        ) : seatPlans.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-slate-50/60 p-12 text-center space-y-3">
            <Grid size={40} className="mx-auto text-gray-300" />
            <h3 className="text-sm font-bold text-gray-700">No Seat Plan Generated for {selectedShift} Shift Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Select an exam, choose shift ({selectedShift}), select classes, and click &quot;Generate Smart {selectedShift} Seat Plan&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(seatPlansByRoom).map(([rId, { room, seats, benches }]) => {
              const breakdown = getRoomLayoutBreakdown(room);
              const benchKeys = Object.keys(benches).map(Number).sort((a, b) => a - b);
              const leftBenchKeys = benchKeys.slice(0, breakdown.leftBenches);
              const middleBenchKeys = breakdown.columnLayout === '3_COLUMNS'
                ? benchKeys.slice(breakdown.leftBenches, breakdown.leftBenches + breakdown.middleBenches)
                : [];
              const rightBenchKeys = benchKeys.slice(
                breakdown.leftBenches + (breakdown.columnLayout === '3_COLUMNS' ? breakdown.middleBenches : 0)
              );

              return (
                <div
                  key={rId}
                  className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5"
                >
                  {/* Room Banner */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#1e3a5f] text-white flex items-center justify-center font-black text-sm shadow-xs">
                        🏢
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900">
                          {room.roomNo} ({room.building || 'Main Block'})
                        </h3>
                        <p className="text-xs text-gray-500">
                          Total Desks in Room: <strong>{room.totalBenches}</strong> &bull; Seated Students: <strong>{seats.length}</strong> &bull; Shift: <span className="font-bold text-purple-700">{selectedShift}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap justify-between lg:justify-end">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                          Left: {leftBenchKeys.length} Desks ({breakdown.leftSeatsPerBench}/desk)
                        </span>
                        {middleBenchKeys.length > 0 && (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                            Middle: {middleBenchKeys.length} Desks ({breakdown.middleSeatsPerBench}/desk)
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                          Right: {rightBenchKeys.length} Desks ({breakdown.rightSeatsPerBench}/desk)
                        </span>
                      </div>

                      {/* Room-specific Print Actions */}
                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                        <button
                          type="button"
                          onClick={() => printDoorNotice(room.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition active:scale-95"
                          title={`Print Door Notice for Room ${room.roomNo} only`}
                        >
                          <Printer size={12} className="text-amber-300" />
                          <span>Door Notice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printDeskSlips(room.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-blue-600 bg-blue-700 hover:bg-blue-800 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition active:scale-95"
                          title={`Print Desk Slips for Room ${room.roomNo} only`}
                        >
                          <Printer size={12} className="text-cyan-200" />
                          <span>Desk Slips</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Teacher's Podium / Blackboard Bar at Front */}
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3 text-center text-xs font-extrabold text-emerald-900 shadow-2xs flex items-center justify-center gap-2">
                    <span>👨‍🏫 FRONT OF CLASSROOM: Teacher&apos;s Desk / Whiteboard (अगाडिको पोडियम / कालोपाटी)</span>
                  </div>

                  {/* Physical Column Desk Grid */}
                  <div className={`grid grid-cols-1 ${middleBenchKeys.length > 0 ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-6 relative`}>
                    {/* LEFT COLUMN DESKS */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                          <span>⬅️ बायाँ लहर (LEFT ROW DESKS)</span>
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">{leftBenchKeys.length} Desks &bull; {breakdown.leftSeatsPerBench} seats/desk</span>
                      </div>

                      <div className="space-y-2.5">
                        {leftBenchKeys.map((bNo) => {
                          const bSeats = benches[bNo] || [];

                          return (
                            <div
                              key={bNo}
                              className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-2xs space-y-1.5 hover:border-blue-400 transition"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                                  🪑 Bench #{bNo}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {room.roomNo}-B{bNo}
                                </span>
                              </div>

                              {/* Dynamic Seats on this bench */}
                              <div className={`grid ${bSeats.length <= 1 ? 'grid-cols-1' : bSeats.length === 2 ? 'grid-cols-2' : bSeats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2 text-xs`}>
                                {bSeats.length > 0 ? (
                                  bSeats.map((seat: any, sIdx: number) => (
                                    <div key={sIdx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-1 hover:bg-amber-50/30 transition shadow-2xs">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-extrabold px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 font-mono text-[11px] border border-amber-300 shadow-2xs">
                                          🪑 {seat.seatNo || `Seat #${sIdx + 1}`}
                                        </span>
                                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                          seat.seatPosition === 'LEFT' ? 'text-blue-700 bg-blue-100 border border-blue-200' :
                                          seat.seatPosition === 'RIGHT' ? 'text-purple-700 bg-purple-100 border border-purple-200' :
                                          seat.seatPosition === 'MIDDLE' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                                          seat.seatPosition === 'MID-L' ? 'text-cyan-700 bg-cyan-100 border border-cyan-200' :
                                          seat.seatPosition === 'MID-R' ? 'text-indigo-700 bg-indigo-100 border border-indigo-200' :
                                          'text-amber-700 bg-amber-100 border border-amber-200'
                                        }`}>
                                          {seat.seatPosition}
                                        </span>
                                      </div>
                                      <p className="font-bold text-gray-900 text-xs truncate">
                                        {seat.student?.fullName}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] pt-0.5">
                                        <span
                                          className={`inline-block font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(
                                            seat.student?.classEnrollment?.[0]?.class?.name || 'Class'
                                          )}`}
                                        >
                                          {seat.student?.classEnrollment?.[0]?.class?.name || 'Class'}
                                        </span>
                                        {seat?.rollNo && (
                                          <span className="font-bold text-gray-600 font-mono">
                                            Roll: #{seat.rollNo}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2 text-center text-gray-400 italic text-[11px]">
                                    Empty Bench
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* MIDDLE COLUMN DESKS (If present) */}
                    {middleBenchKeys.length > 0 && (
                      <div className="space-y-3 rounded-2xl border border-purple-200 bg-purple-50/30 p-4">
                        <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                          <span className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5">
                            <span>↔️ बीचको लहर (MIDDLE ROW DESKS)</span>
                          </span>
                          <span className="text-[11px] font-mono text-gray-500">{middleBenchKeys.length} Desks &bull; {breakdown.middleSeatsPerBench} seats/desk</span>
                        </div>

                        <div className="space-y-2.5">
                          {middleBenchKeys.map((bNo) => {
                            const bSeats = benches[bNo] || [];

                            return (
                              <div
                                key={bNo}
                                className="rounded-xl border border-purple-300 bg-white p-2.5 shadow-2xs space-y-1.5 hover:border-purple-400 transition"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1">
                                  <span className="font-mono bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                                    🪑 Bench #{bNo}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {room.roomNo}-B{bNo}
                                  </span>
                                </div>

                                <div className={`grid ${bSeats.length <= 1 ? 'grid-cols-1' : bSeats.length === 2 ? 'grid-cols-2' : bSeats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2 text-xs`}>
                                  {bSeats.length > 0 ? (
                                    bSeats.map((seat: any, sIdx: number) => (
                                      <div key={sIdx} className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 space-y-1 hover:bg-amber-50/30 transition shadow-2xs">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-extrabold px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 font-mono text-[11px] border border-amber-300 shadow-2xs">
                                            🪑 {seat.seatNo || `Seat #${sIdx + 1}`}
                                          </span>
                                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                            seat.seatPosition === 'LEFT' ? 'text-blue-700 bg-blue-100 border border-blue-200' :
                                            seat.seatPosition === 'RIGHT' ? 'text-purple-700 bg-purple-100 border border-purple-200' :
                                            seat.seatPosition === 'MIDDLE' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                                            'text-amber-700 bg-amber-100 border border-amber-200'
                                          }`}>
                                            {seat.seatPosition}
                                          </span>
                                        </div>
                                        <p className="font-bold text-gray-900 text-xs truncate">
                                          {seat.student?.fullName}
                                        </p>
                                        <div className="flex items-center justify-between text-[10px] pt-0.5">
                                          <span
                                            className={`inline-block font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(
                                              seat.student?.classEnrollment?.[0]?.class?.name || 'Class'
                                            )}`}
                                          >
                                            {seat.student?.classEnrollment?.[0]?.class?.name || 'Class'}
                                          </span>
                                          {seat?.rollNo && (
                                            <span className="font-bold text-gray-600 font-mono">
                                              Roll: #{seat.rollNo}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="col-span-full rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-2 text-center text-gray-400 italic text-[11px]">
                                      Empty Bench
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* RIGHT COLUMN DESKS */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                          <span>➡️ दायाँ लहर (RIGHT ROW DESKS)</span>
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">{rightBenchKeys.length} Desks &bull; {breakdown.rightSeatsPerBench} seats/desk</span>
                      </div>

                      <div className="space-y-2.5">
                        {rightBenchKeys.map((bNo) => {
                          const bSeats = benches[bNo] || [];

                          return (
                            <div
                              key={bNo}
                              className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-2xs space-y-1.5 hover:border-blue-400 transition"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                                  🪑 Bench #{bNo}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {room.roomNo}-B{bNo}
                                </span>
                              </div>

                              {/* Dynamic Seats on this bench */}
                              <div className={`grid ${bSeats.length <= 1 ? 'grid-cols-1' : bSeats.length === 2 ? 'grid-cols-2' : bSeats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2 text-xs`}>
                                {bSeats.length > 0 ? (
                                  bSeats.map((seat: any, sIdx: number) => (
                                    <div key={sIdx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-1 hover:bg-amber-50/30 transition shadow-2xs">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-extrabold px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 font-mono text-[11px] border border-amber-300 shadow-2xs">
                                          🪑 {seat.seatNo || `Seat #${sIdx + 1}`}
                                        </span>
                                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                          seat.seatPosition === 'LEFT' ? 'text-blue-700 bg-blue-100 border border-blue-200' :
                                          seat.seatPosition === 'RIGHT' ? 'text-purple-700 bg-purple-100 border border-purple-200' :
                                          seat.seatPosition === 'MIDDLE' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' :
                                          seat.seatPosition === 'MID-L' ? 'text-cyan-700 bg-cyan-100 border border-cyan-200' :
                                          seat.seatPosition === 'MID-R' ? 'text-indigo-700 bg-indigo-100 border border-indigo-200' :
                                          'text-amber-700 bg-amber-100 border border-amber-200'
                                        }`}>
                                          {seat.seatPosition}
                                        </span>
                                      </div>
                                      <p className="font-bold text-gray-900 text-xs truncate">
                                        {seat.student?.fullName}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] pt-0.5">
                                        <span
                                          className={`inline-block font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(
                                            seat.student?.classEnrollment?.[0]?.class?.name || 'Class'
                                          )}`}
                                        >
                                          {seat.student?.classEnrollment?.[0]?.class?.name || 'Class'}
                                        </span>
                                        {seat?.rollNo && (
                                          <span className="font-bold text-gray-600 font-mono">
                                            Roll: #{seat.rollNo}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2 text-center text-gray-400 italic text-[11px]">
                                    Empty Bench
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD ROOM MODAL ─────────────────────────────────────────────────── */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Building className="text-blue-600" size={18} />
                <h3 className="text-sm font-bold text-gray-900">Add Exam Room (परीक्षा कोठा तथा डेस्क संरचना)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRoomMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Room No / Name *</label>
                  <input
                    type="text"
                    required
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    placeholder="e.g. Room 101, Hall A"
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Building / Block</label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. Main Building"
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Physical Desk Columns Layout */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                    <Columns size={14} className="text-blue-600" />
                    <span>Physical Desk Columns & Seats Setup (कोठाको लहर तथा सिट संरचना)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setColumnLayout('2_COLUMNS')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                        columnLayout === '2_COLUMNS'
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      २ लहर (2 Rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => setColumnLayout('3_COLUMNS')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                        columnLayout === '3_COLUMNS'
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      ३ लहर (3 Rows)
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${columnLayout === '3_COLUMNS' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                  {/* LEFT SIDE SETUP */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                    <span className="font-bold text-xs text-blue-900 block border-b border-blue-100 pb-1">
                      ⬅️ बायाँ लहर (Left Row)
                    </span>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={leftBenches}
                        onChange={(e) => setLeftBenches(e.target.value)}
                        className="erp-input font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setLeftSeatsPerBench(String(num))}
                            className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                              leftSeatsPerBench === String(num)
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-blue-700 text-right pt-0.5">
                      क्षमता: {(parseInt(leftBenches) || 0) * (parseInt(leftSeatsPerBench) || 2)} जना
                    </div>
                  </div>

                  {/* MIDDLE SIDE SETUP (If 3 Columns) */}
                  {columnLayout === '3_COLUMNS' && (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                      <span className="font-bold text-xs text-purple-900 block border-b border-purple-100 pb-1">
                        ↔️ बीचको लहर (Middle Row)
                      </span>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={middleBenches}
                          onChange={(e) => setMiddleBenches(e.target.value)}
                          className="erp-input font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setMiddleSeatsPerBench(String(num))}
                              className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                                middleSeatsPerBench === String(num)
                                  ? 'bg-purple-700 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-purple-700 text-right pt-0.5">
                        क्षमता: {(parseInt(middleBenches) || 0) * (parseInt(middleSeatsPerBench) || 2)} जना
                      </div>
                    </div>
                  )}

                  {/* RIGHT SIDE SETUP */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                    <span className="font-bold text-xs text-indigo-900 block border-b border-indigo-100 pb-1">
                      ➡️ दायाँ लहर (Right Row)
                    </span>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={rightBenches}
                        onChange={(e) => setRightBenches(e.target.value)}
                        className="erp-input font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRightSeatsPerBench(String(num))}
                            className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                              rightSeatsPerBench === String(num)
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-indigo-700 text-right pt-0.5">
                      क्षमता: {(parseInt(rightBenches) || 0) * (parseInt(rightSeatsPerBench) || 2)} जना
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-blue-200 flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-600 font-bold">
                    कुल बेन्च: {(parseInt(leftBenches) || 0) + (parseInt(rightBenches) || 0) + (columnLayout === '3_COLUMNS' ? (parseInt(middleBenches) || 0) : 0)} Benches
                  </span>
                  <span className="font-extrabold text-blue-900 text-sm">
                    👥 कुल सिट क्षमता: {
                      ((parseInt(leftBenches) || 0) * (parseInt(leftSeatsPerBench) || 2)) +
                      ((parseInt(rightBenches) || 0) * (parseInt(rightSeatsPerBench) || 2)) +
                      (columnLayout === '3_COLUMNS' ? ((parseInt(middleBenches) || 0) * (parseInt(middleSeatsPerBench) || 2)) : 0)
                    } Students
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoomMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {createRoomMutation.isPending ? 'Saving...' : 'Create Exam Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT ROOM MODAL ────────────────────────────────────────────────── */}
      {isEditRoomModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Building className="text-blue-600" size={18} />
                <h3 className="text-sm font-bold text-gray-900">Edit Exam Room (कोठा तथा डेस्क संरचना सम्पादन)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditRoomModalOpen(false);
                  setEditingRoom(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateRoomMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Room No / Name *</label>
                  <input
                    type="text"
                    required
                    value={editRoomNo}
                    onChange={(e) => setEditRoomNo(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Building / Block</label>
                  <input
                    type="text"
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              {/* Physical Desk Columns Layout for Edit */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                    <Columns size={14} className="text-blue-600" />
                    <span>Physical Desk Columns & Seats Setup (कोठाको लहर तथा सिट संरचना)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditColumnLayout('2_COLUMNS')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                        editColumnLayout === '2_COLUMNS'
                          ? 'bg-blue-700 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      २ लहर
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditColumnLayout('3_COLUMNS')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                        editColumnLayout === '3_COLUMNS'
                          ? 'bg-blue-700 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      ३ लहर
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${editColumnLayout === '3_COLUMNS' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                  {/* EDIT LEFT SIDE SETUP */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                    <span className="font-bold text-xs text-blue-900 block border-b border-blue-100 pb-1">
                      ⬅️ बायाँ लहर (Left Row)
                    </span>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={editLeftBenches}
                        onChange={(e) => setEditLeftBenches(e.target.value)}
                        className="erp-input font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditLeftSeatsPerBench(String(num))}
                            className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                              editLeftSeatsPerBench === String(num)
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-blue-700 text-right pt-0.5">
                      क्षमता: {(parseInt(editLeftBenches) || 0) * (parseInt(editLeftSeatsPerBench) || 2)} जना
                    </div>
                  </div>

                  {/* EDIT MIDDLE SIDE SETUP (If 3 Columns) */}
                  {editColumnLayout === '3_COLUMNS' && (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                      <span className="font-bold text-xs text-purple-900 block border-b border-purple-100 pb-1">
                        ↔️ बीचको लहर (Middle Row)
                      </span>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editMiddleBenches}
                          onChange={(e) => setEditMiddleBenches(e.target.value)}
                          className="erp-input font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setEditMiddleSeatsPerBench(String(num))}
                              className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                                editMiddleSeatsPerBench === String(num)
                                  ? 'bg-purple-700 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-purple-700 text-right pt-0.5">
                        क्षमता: {(parseInt(editMiddleBenches) || 0) * (parseInt(editMiddleSeatsPerBench) || 2)} जना
                      </div>
                    </div>
                  )}

                  {/* EDIT RIGHT SIDE SETUP */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                    <span className="font-bold text-xs text-indigo-900 block border-b border-indigo-100 pb-1">
                      ➡️ दायाँ लहर (Right Row)
                    </span>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">डेस्क/बेन्च सङ्ख्या (Desks):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={editRightBenches}
                        onChange={(e) => setEditRightBenches(e.target.value)}
                        className="erp-input font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">सिट प्रति डेस्क (Seats / Desk):</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditRightSeatsPerBench(String(num))}
                            className={`flex-1 py-1 rounded text-[10.5px] font-bold transition ${
                              editRightSeatsPerBench === String(num)
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2' : num === 3 ? '3' : '4'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-indigo-700 text-right pt-0.5">
                      क्षमता: {(parseInt(editRightBenches) || 0) * (parseInt(editRightSeatsPerBench) || 2)} जना
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-blue-200 flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-600 font-bold">
                    कुल बेन्च: {(parseInt(editLeftBenches) || 0) + (parseInt(editRightBenches) || 0) + (editColumnLayout === '3_COLUMNS' ? (parseInt(editMiddleBenches) || 0) : 0)} Benches
                  </span>
                  <span className="font-extrabold text-blue-900 text-sm">
                    👥 कुल सिट क्षमता: {
                      ((parseInt(editLeftBenches) || 0) * (parseInt(editLeftSeatsPerBench) || 2)) +
                      ((parseInt(editRightBenches) || 0) * (parseInt(editRightSeatsPerBench) || 2)) +
                      (editColumnLayout === '3_COLUMNS' ? ((parseInt(editMiddleBenches) || 0) * (parseInt(editMiddleSeatsPerBench) || 2)) : 0)
                    } Students
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditRoomModalOpen(false);
                    setEditingRoom(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoomMutation.isPending}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {updateRoomMutation.isPending ? 'Saving...' : 'Update Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ELIGIBILITY & ATTENDANCE FILTER MODAL ──────────────────────────── */}
      {isEligibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Student Eligibility & Attendance Review (परीक्षामा समावेश/बहिष्कार सूची)
                  </h3>
                  <p className="text-xs text-gray-500">
                    न्यून हाजिरी वा परीक्षामा अनुपस्थित हुने विद्यार्थीहरूलाई सिट योजनाबाट हटाउनुहोस् जसले गर्दा सिट खेर जाँदैन।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEligibilityModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll..."
                    value={eligibilitySearch}
                    onChange={(e) => setEligibilitySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={eligibilityClassFilter}
                  onChange={(e) => setEligibilityClassFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="ALL">All Classes ({studentsEligibility.length})</option>
                  {Array.from(new Set(studentsEligibility.map((s: any) => s.className))).map((cName: any) => (
                    <option key={cName} value={cName}>
                      {cName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExcludeLowAttendance(75)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center gap-1 shadow-xs"
                  title="Auto exclude students with < 75% attendance"
                >
                  <UserMinus size={13} />
                  <span>Exclude &lt; 75%</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExcludeLowAttendance(60)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 flex items-center gap-1 shadow-xs"
                  title="Auto exclude students with < 60% attendance"
                >
                  <UserMinus size={13} />
                  <span>Exclude &lt; 60%</span>
                </button>
                <button
                  type="button"
                  onClick={handleIncludeAllStudents}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 flex items-center gap-1 shadow-xs"
                >
                  <UserCheck size={13} />
                  <span>Include All</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl">
              {isEligibilityLoading ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  <RotateCcw className="animate-spin inline mr-2 text-blue-600" size={16} />
                  Loading students eligibility and attendance records...
                </div>
              ) : studentsEligibility.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No enrolled students found for the selected classes.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-gray-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Status</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3 text-center">Roll No</th>
                      <th className="py-2.5 px-3">Attendance %</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentsEligibility
                      .filter((s: any) => {
                        if (eligibilityClassFilter !== 'ALL' && s.className !== eligibilityClassFilter) return false;
                        if (
                          eligibilitySearch.trim() &&
                          !s.fullName.toLowerCase().includes(eligibilitySearch.toLowerCase()) &&
                          !String(s.rollNo || '').includes(eligibilitySearch)
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .map((student: any) => {
                        const isExcluded = excludedStudentIds.includes(student.studentId);
                        const attPct = student.attendancePct ?? 100;
                        const isLow = attPct < 75;

                        return (
                          <tr
                            key={student.studentId}
                            className={`hover:bg-slate-50 transition ${
                              isExcluded ? 'bg-rose-50/40 opacity-70' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={() => handleToggleExcludeStudent(student.studentId)}
                                className="h-4 w-4 rounded text-[#1e3a5f] focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 font-bold text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <span>{student.fullName}</span>
                                {student.status !== 'ACTIVE' && (
                                  <span className="px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 text-[9px] font-bold">
                                    {student.status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600 font-medium">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1e3a5f] font-bold text-[11px]">
                                {student.className}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">
                              #{student.rollNo || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      attPct >= 75 ? 'bg-emerald-500' : attPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(attPct, 100)}%` }}
                                  />
                                </div>
                                <span
                                  className={`font-mono font-bold text-[11px] ${
                                    attPct >= 75 ? 'text-emerald-700' : attPct >= 60 ? 'text-amber-700' : 'text-rose-600'
                                  }`}
                                >
                                  {attPct}%
                                </span>
                                {student.totalDays > 0 && (
                                  <span className="text-[10px] text-gray-400">
                                    ({student.presentDays}/{student.totalDays}d)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleExcludeStudent(student.studentId)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                  isExcluded
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                }`}
                              >
                                {isExcluded ? '➕ Include in Exam' : '🚫 Exclude'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-600">
                Total Students: <strong className="text-gray-900">{studentsEligibility.length}</strong> | Included:{' '}
                <strong className="text-emerald-700">
                  {studentsEligibility.length - excludedStudentIds.length}
                </strong>{' '}
                | Excluded: <strong className="text-rose-600">{excludedStudentIds.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsEligibilityModalOpen(false)}
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-sm"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LATE / WALK-IN STUDENT ALLOTMENT MODAL ─────────────────────────── */}
      {isAllotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Allot Late / Walk-in Student (ढिलो आएका विद्यार्थी सिट व्यवस्थापन)
                  </h3>
                  <p className="text-xs text-gray-500">
                    परीक्षाको दिन उपस्थित भएका वा छुटेका विद्यार्थीलाई खाली सिटमा तत्काल समावेश गर्नुहोस्।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllotModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                allotStudentMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              {/* Student Selector */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Student (विद्यार्थी छान्नुहोस्) *</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Filter student list..."
                    value={allotSearchQuery}
                    onChange={(e) => setAllotSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <select
                    required
                    value={allotStudentId}
                    onChange={(e) => setAllotStudentId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">-- Choose Student --</option>
                    {studentsEligibility
                      .filter((s: any) => {
                        if (
                          allotSearchQuery.trim() &&
                          !s.fullName.toLowerCase().includes(allotSearchQuery.toLowerCase()) &&
                          !String(s.rollNo || '').includes(allotSearchQuery)
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .map((s: any) => {
                        const isAlreadySeated = seatPlans.some((sp: any) => sp.studentId === s.studentId);
                        const isExcluded = excludedStudentIds.includes(s.studentId);
                        return (
                          <option key={s.studentId} value={s.studentId}>
                            {s.fullName} ({s.className}, Roll #{s.rollNo || '-'}) {isAlreadySeated ? '— [Already Seated]' : isExcluded ? '— [Excluded]' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Room Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Room (परीक्षा कोठा)</label>
                  <select
                    value={allotRoomId}
                    onChange={(e) => setAllotRoomId(e.target.value)}
                    className="erp-input"
                  >
                    <option value="">Auto-Assign (पहिलो खाली कोठा)</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNo} ({r.building || 'Block'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500">खाली छाडेमा स्वतः उपयुक्त कोठा छानिनेछ</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Desk / Bench No (वैकल्पिक)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Auto (स्वतः खाली बेन्च)"
                    value={allotBenchNo}
                    onChange={(e) => setAllotBenchNo(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              {/* Seat Position */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Seat Position (सिट स्थिति)</label>
                <select
                  value={allotPosition}
                  onChange={(e) => setAllotPosition(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="AUTO">Auto-detect next open position (स्वतः स्थान)</option>
                  <option value="LEFT">LEFT (बायाँ सिट)</option>
                  <option value="MID-L">MID-L (बायाँ-मध्य सिट)</option>
                  <option value="MID-R">MID-R (दायाँ-मध्य सिट)</option>
                  <option value="RIGHT">RIGHT (दायाँ सिट)</option>
                  <option value="MIDDLE">MIDDLE (मध्य सिट)</option>
                  <option value="SINGLE">SINGLE (एकल सिट)</option>
                </select>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  सिट निर्धारण गर्दा एन्टी-चिटिङ (Anti-cheating) नियम लागू हुनेछ र सोही कक्षाको विद्यार्थी एउटै डेस्कमा नपर्ने गरी स्थान दिइनेछ।
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAllotModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allotStudentMutation.isPending || !allotStudentId}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserCheck size={14} />
                  <span>{allotStudentMutation.isPending ? 'Allotting...' : 'Confirm & Seat Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
