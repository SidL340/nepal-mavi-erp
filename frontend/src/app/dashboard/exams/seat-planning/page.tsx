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

  // Add Room Modal & Form
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [roomNo, setRoomNo] = useState('');
  const [building, setBuilding] = useState('Main Block');
  const [columnLayout, setColumnLayout] = useState<'2_COLUMNS' | '3_COLUMNS' | '1_COLUMN'>('2_COLUMNS');
  const [leftBenches, setLeftBenches] = useState('8');
  const [rightBenches, setRightBenches] = useState('8');
  const [middleBenches, setMiddleBenches] = useState('0');
  const [seatsPerBench, setSeatsPerBench] = useState('2');

  // Edit Room Modal & Form
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [editRoomNo, setEditRoomNo] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editColumnLayout, setEditColumnLayout] = useState<'2_COLUMNS' | '3_COLUMNS' | '1_COLUMN'>('2_COLUMNS');
  const [editLeftBenches, setEditLeftBenches] = useState('8');
  const [editRightBenches, setEditRightBenches] = useState('8');
  const [editMiddleBenches, setEditMiddleBenches] = useState('0');
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

  // Helper to parse room column configuration
  const getRoomLayoutBreakdown = (r: any) => {
    const total = r.totalBenches || 16;
    const l = Math.ceil(total / 2);
    const right = total - l;
    return {
      leftBenches: l,
      rightBenches: right,
      middleBenches: 0,
      seatsPerBench: r.seatsPerBench || 2,
    };
  };

  // Create Room Mutation
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!roomNo.trim()) throw new Error('Please enter Room Number/Name.');
      const l = parseInt(leftBenches) || 0;
      const r = parseInt(rightBenches) || 0;
      const m = columnLayout === '3_COLUMNS' ? parseInt(middleBenches) || 0 : 0;
      const computedTotalBenches = l + r + m || 16;
      const spb = parseInt(seatsPerBench) || 2;

      const res = await api.post('/seat-plans/rooms', {
        roomNo: roomNo.trim(),
        building: building.trim(),
        totalBenches: computedTotalBenches,
        seatsPerBench: spb,
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
      const r = parseInt(editRightBenches) || 0;
      const m = editColumnLayout === '3_COLUMNS' ? parseInt(editMiddleBenches) || 0 : 0;
      const computedTotalBenches = l + r + m || 16;
      const spb = parseInt(editSeatsPerBench) || 2;

      const res = await api.put(`/seat-plans/rooms/${editingRoom.id}`, {
        roomNo: editRoomNo.trim(),
        building: editBuilding.trim(),
        totalBenches: computedTotalBenches,
        seatsPerBench: spb,
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
    setEditRightBenches(String(breakdown.rightBenches));
    setEditMiddleBenches('0');
    setEditColumnLayout('2_COLUMNS');
    setEditSeatsPerBench(String(r.seatsPerBench || 2));
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

  // Auto Generate Seat Plan Mutation
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

  // Print Door Notice (ढोका सूचना)
  const printDoorNotice = () => {
    if (seatPlans.length === 0) {
      toast.error('No seat plan to print. Please generate seats first.');
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
          @page { size: A4; margin: 12mm; }
          body { font-family: sans-serif; font-size: 11px; margin: 0; padding: 0; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 16px; font-weight: bold; color: #1e3a5f; }
          .subtitle { font-size: 13px; font-weight: bold; margin-top: 2px; }
          .meta { font-size: 11px; margin-top: 4px; color: #444; }
          .room-card { page-break-after: always; margin-bottom: 20px; }
          .room-header { background: #1e3a5f; color: white; padding: 8px 12px; font-size: 13px; font-weight: bold; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; }
          .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .column-title { text-align: center; background: #e2e8f0; font-weight: bold; padding: 4px; font-size: 11px; border-radius: 3px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .desk-no { font-weight: bold; font-family: monospace; }
          .student-name { font-weight: bold; }
          .class-tag { font-weight: bold; color: #1e3a5f; }
        </style>
      </head>
      <body>
    `;

    Object.values(seatPlansByRoom).forEach(({ room, seats, benches }) => {
      const benchKeys = Object.keys(benches).map(Number).sort((a, b) => a - b);
      const half = Math.ceil(benchKeys.length / 2);
      const leftBenchKeys = benchKeys.slice(0, half);
      const rightBenchKeys = benchKeys.slice(half);

      html += `
        <div class="room-card">
          <div class="header">
            <div class="title">श्री नेपाल माध्यमिक विद्यालय (NEPAL SECONDARY SCHOOL)</div>
            <div class="subtitle">परीक्षा कक्षा ढोका टाँस सूचना (EXAMINATION DOOR NOTICE)</div>
            <div class="meta">
              <strong>${examTitle}</strong> &nbsp;|&nbsp; 
              <strong>सत्र (Shift):</strong> ${shiftInfo?.nameNepali || selectedShift} (${shiftInfo?.startTime || ''} - ${shiftInfo?.endTime || ''})
            </div>
          </div>

          <div class="room-header">
            <span>कोठा नं: ${room.roomNo} (${room.building || 'Main Block'})</span>
            <span>कुल विद्यार्थी: ${seats.length} जना &nbsp;|&nbsp; कुल बेन्च: ${benchKeys.length}</span>
          </div>

          <div class="grid-container">
            <div>
              <div class="column-title">⬅️ बायाँ लहर (LEFT ROW BENCHES)</div>
              <table>
                <thead>
                  <tr>
                    <th>Bench</th>
                    <th>बायाँ सिट (Left)</th>
                    <th>दायाँ सिट (Right)</th>
                  </tr>
                </thead>
                <tbody>
                  ${leftBenchKeys.map((bNo) => {
                    const bSeats = benches[bNo] || [];
                    const leftS = bSeats.find((s: any) => s.seatPosition === 'LEFT');
                    const rightS = bSeats.find((s: any) => s.seatPosition === 'RIGHT');
                    return `
                      <tr>
                        <td class="desk-no">B-${bNo}</td>
                        <td>${leftS ? `<span class="student-name">${leftS.student?.fullName}</span><br><span class="class-tag">${leftS.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: ${leftS.rollNo || '-'})</span>` : '<span style="color:#999">-</span>'}</td>
                        <td>${rightS ? `<span class="student-name">${rightS.student?.fullName}</span><br><span class="class-tag">${rightS.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: ${rightS.rollNo || '-'})</span>` : '<span style="color:#999">-</span>'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div>
              <div class="column-title">➡️ दायाँ लहर (RIGHT ROW BENCHES)</div>
              <table>
                <thead>
                  <tr>
                    <th>Bench</th>
                    <th>बायाँ सिट (Left)</th>
                    <th>दायाँ सिट (Right)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rightBenchKeys.map((bNo) => {
                    const bSeats = benches[bNo] || [];
                    const leftS = bSeats.find((s: any) => s.seatPosition === 'LEFT');
                    const rightS = bSeats.find((s: any) => s.seatPosition === 'RIGHT');
                    return `
                      <tr>
                        <td class="desk-no">B-${bNo}</td>
                        <td>${leftS ? `<span class="student-name">${leftS.student?.fullName}</span><br><span class="class-tag">${leftS.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: ${leftS.rollNo || '-'})</span>` : '<span style="color:#999">-</span>'}</td>
                        <td>${rightS ? `<span class="student-name">${rightS.student?.fullName}</span><br><span class="class-tag">${rightS.student?.classEnrollment?.[0]?.class?.name || ''} (Roll: ${rightS.rollNo || '-'})</span>` : '<span style="color:#999">-</span>'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
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

  // Print Desk Slips (डेस्क स्लिपहरू)
  const printDeskSlips = () => {
    if (seatPlans.length === 0) {
      toast.error('No seat plan to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? currentExam.name : 'Examination';
    const shiftInfo = availableShifts.find((s) => s.name === selectedShift);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Desk Slips - ${examTitle}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { font-family: sans-serif; font-size: 10px; margin: 0; padding: 0; }
          .slips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
          .slip-card {
            border: 1.5px dashed #475569;
            border-radius: 6px;
            padding: 8px 10px;
            box-sizing: border-box;
            background: #fff;
            position: relative;
          }
          .school-name { font-weight: bold; font-size: 11px; text-align: center; color: #1e3a5f; }
          .exam-name { font-size: 9.5px; text-align: center; color: #475569; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
          .bench-badge { background: #1e3a5f; color: white; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 3px; display: inline-block; }
          .side-badge { font-weight: bold; font-size: 9px; padding: 2px 4px; border-radius: 3px; }
          .student-info { margin-top: 4px; font-size: 11px; }
          .student-name { font-size: 12px; font-weight: bold; color: #0f172a; }
          .meta-row { display: flex; justify-content: space-between; margin-top: 3px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="slips-grid">
    `;

    seatPlans.forEach((seat: any) => {
      html += `
        <div class="slip-card">
          <div class="school-name">NEPAL SECONDARY SCHOOL</div>
          <div class="exam-name">${examTitle} &bull; ${shiftInfo?.nameNepali || selectedShift}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span class="bench-badge">${seat.room?.roomNo || 'Room'} &bull; Bench #${seat.benchNo}</span>
            <span class="side-badge" style="background:${seat.seatPosition === 'LEFT' ? '#dbeafe; color:#1e40af' : '#f3e8ff; color:#6b21a8'}">${seat.seatPosition} SEAT</span>
          </div>
          <div class="student-info">
            <div class="student-name">${seat.student?.fullName}</div>
            <div class="meta-row">
              <span><strong>Class:</strong> ${seat.student?.classEnrollment?.[0]?.class?.name || '—'}</span>
              <span><strong>Roll No:</strong> ${seat.rollNo || '—'}</span>
              <span><strong>EMIS:</strong> ${seat.student?.studentId || seat.student?.emisId || '—'}</span>
            </div>
          </div>
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
            onClick={printDoorNotice}
            disabled={seatPlans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
          >
            <Printer size={14} className="text-blue-600" />
            <span>Print Door Notice (ढोका टाँस)</span>
          </button>

          <button
            type="button"
            onClick={printDeskSlips}
            disabled={seatPlans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
          >
            <Printer size={14} className="text-purple-600" />
            <span>Desk Slips (स्लिपहरू)</span>
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

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-purple-100">
          <p className="text-[11px] text-gray-500 font-nepali">
            💡 &quot;Smart Auto-Allocate&quot; ले फरक-फरक कक्षाका विद्यार्थीहरूलाई एकापसमा मिलाएर (Interleaving) नक्कल रोक्ने गरी सिट निर्धारण गर्दछ।
          </p>

          <button
            type="button"
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending || !selectedExamId || selectedClassIds.length === 0}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Columns className="text-blue-600" size={18} />
              <span>Realistic Physical Classroom Layout (भौतिक कक्षा कोठा सिट संरचना)</span>
            </h2>
            <p className="text-xs text-gray-500">
              Active Shift: <strong className="text-purple-900">{selectedShift} Shift</strong> &bull; Total Seated Students: <strong>{seatPlans.length}</strong>
            </p>
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
              const benchKeys = Object.keys(benches).map(Number).sort((a, b) => a - b);
              const half = Math.ceil(benchKeys.length / 2);
              const leftBenchKeys = benchKeys.slice(0, half);
              const rightBenchKeys = benchKeys.slice(half);

              return (
                <div
                  key={rId}
                  className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5"
                >
                  {/* Room Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
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

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                        Left Row: {leftBenchKeys.length} Desks
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                        Right Row: {rightBenchKeys.length} Desks
                      </span>
                    </div>
                  </div>

                  {/* Teacher's Podium / Blackboard Bar at Front */}
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3 text-center text-xs font-extrabold text-emerald-900 shadow-2xs flex items-center justify-center gap-2">
                    <span>👨‍🏫 FRONT OF CLASSROOM: Teacher&apos;s Desk / Whiteboard (अगाडिको पोडियम / कालोपाटी)</span>
                  </div>

                  {/* Physical 2-Column Desk Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* LEFT COLUMN DESKS */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                          <span>⬅️ बायाँ लहर (LEFT ROW DESKS)</span>
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">{leftBenchKeys.length} Desks</span>
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
                                    <div key={sIdx} className="rounded-lg border border-slate-100 bg-slate-50 p-2 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                          seat.seatPosition === 'LEFT' ? 'text-blue-700 bg-blue-100' :
                                          seat.seatPosition === 'RIGHT' ? 'text-purple-700 bg-purple-100' :
                                          seat.seatPosition === 'MIDDLE' ? 'text-emerald-700 bg-emerald-100' :
                                          'text-amber-700 bg-amber-100'
                                        }`}>
                                          {seat.seatPosition}
                                        </span>
                                        {seat?.rollNo && (
                                          <span className="text-[10px] font-bold text-gray-600 font-mono">
                                            Roll: {seat.rollNo}
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-bold text-gray-900 text-xs truncate">
                                        {seat.student?.fullName}
                                      </p>
                                      <span
                                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(
                                          seat.student?.classEnrollment?.[0]?.class?.name || 'Class'
                                        )}`}
                                      >
                                        {seat.student?.classEnrollment?.[0]?.class?.name || 'Class'}
                                      </span>
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

                    {/* RIGHT COLUMN DESKS */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                          <span>➡️ दायाँ लहर (RIGHT ROW DESKS)</span>
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">{rightBenchKeys.length} Desks</span>
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
                                    <div key={sIdx} className="rounded-lg border border-slate-100 bg-slate-50 p-2 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                          seat.seatPosition === 'LEFT' ? 'text-blue-700 bg-blue-100' :
                                          seat.seatPosition === 'RIGHT' ? 'text-purple-700 bg-purple-100' :
                                          seat.seatPosition === 'MIDDLE' ? 'text-emerald-700 bg-emerald-100' :
                                          'text-amber-700 bg-amber-100'
                                        }`}>
                                          {seat.seatPosition}
                                        </span>
                                        {seat?.rollNo && (
                                          <span className="text-[10px] font-bold text-gray-600 font-mono">
                                            Roll: {seat.rollNo}
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-bold text-gray-900 text-xs truncate">
                                        {seat.student?.fullName}
                                      </p>
                                      <span
                                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(
                                          seat.student?.classEnrollment?.[0]?.class?.name || 'Class'
                                        )}`}
                                      >
                                        {seat.student?.classEnrollment?.[0]?.class?.name || 'Class'}
                                      </span>
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
                    <span>Physical Desk Columns (कोठाको लहर संरचना)</span>
                  </span>
                  <span className="text-[10.5px] text-gray-500 font-nepali">२-लहर वा ३-लहर डेस्क</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">⬅️ Left Row Desks *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={leftBenches}
                      onChange={(e) => setLeftBenches(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-500">बायाँ लहरका बेन्च</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">➡️ Right Row Desks *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={rightBenches}
                      onChange={(e) => setRightBenches(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-500">दायाँ लहरका बेन्च</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Seats / Desk (सिट सङ्ख्या) *</label>
                    <div className="space-y-1">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={seatsPerBench}
                        onChange={(e) => setSeatsPerBench(e.target.value)}
                        className="erp-input font-mono font-bold"
                        placeholder="e.g. 2"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSeatsPerBench(String(num))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                              seatsPerBench === String(num)
                                ? 'bg-[#1e3a5f] text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2 (L&R)' : num === 3 ? '3' : `${num}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-blue-200 flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-600 font-bold">
                    Total: {(parseInt(leftBenches) || 0) + (parseInt(rightBenches) || 0)} Benches
                  </span>
                  <span className="font-extrabold text-blue-900">
                    👥 Seating Capacity: {((parseInt(leftBenches) || 0) + (parseInt(rightBenches) || 0)) * (parseInt(seatsPerBench) || 2)} Students
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
                    <span>Physical Desk Columns (कोठाको लहर संरचना)</span>
                  </span>
                  <span className="text-[10.5px] text-gray-500 font-nepali">२-लहर वा ३-लहर डेस्क</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">⬅️ Left Row Desks *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={editLeftBenches}
                      onChange={(e) => setEditLeftBenches(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-500">बायाँ लहरका बेन्च</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">➡️ Right Row Desks *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={editRightBenches}
                      onChange={(e) => setEditRightBenches(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-500">दायाँ लहरका बेन्च</span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Seats / Desk (सिट सङ्ख्या) *</label>
                    <div className="space-y-1">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={editSeatsPerBench}
                        onChange={(e) => setEditSeatsPerBench(e.target.value)}
                        className="erp-input font-mono font-bold"
                        placeholder="e.g. 2"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditSeatsPerBench(String(num))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                              editSeatsPerBench === String(num)
                                ? 'bg-blue-700 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            {num === 1 ? '1' : num === 2 ? '2 (L&R)' : num === 3 ? '3' : `${num}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-blue-200 flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-600 font-bold">
                    Total: {(parseInt(editLeftBenches) || 0) + (parseInt(editRightBenches) || 0)} Benches
                  </span>
                  <span className="font-extrabold text-blue-900">
                    👥 Seating Capacity: {((parseInt(editLeftBenches) || 0) + (parseInt(editRightBenches) || 0)) * (parseInt(editSeatsPerBench) || 2)} Students
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
    </div>
  );
}
