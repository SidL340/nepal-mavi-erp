'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Grid,
  Plus,
  Trash2,
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
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ExamSeatPlanningPage() {
  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('DAY');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedRoomIdsForAllocation, setSelectedRoomIdsForAllocation] = useState<number[]>([]);

  // Room Plan Form
  const [roomNo, setRoomNo] = useState('');
  const [building, setBuilding] = useState('Main Block');
  const [totalBenches, setTotalBenches] = useState('15');
  const [seatsPerBench, setSeatsPerBench] = useState('2');

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

  // When selected exam changes, set default shift
  useEffect(() => {
    if (currentExam) {
      if (examShifts.length > 0) {
        const firstShiftName = examShifts[0].name;
        setSelectedShift(firstShiftName);
      } else if (currentExam.shift) {
        setSelectedShift(currentExam.shift);
      }
    }
  }, [selectedExamId, currentExam]);

  // When shift changes, auto-select classes belonging to that shift
  useEffect(() => {
    if (!currentExam) return;

    if (examShifts.length > 0) {
      const matchedShift = examShifts.find((s: any) => s.name === selectedShift);
      if (matchedShift) {
        let shiftCids: number[] = [];
        try {
          shiftCids = typeof matchedShift.classIds === 'string'
            ? JSON.parse(matchedShift.classIds)
            : (matchedShift.classIds || []);
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

  // Create Room Mutation
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!roomNo.trim()) throw new Error('Please enter Room Number/Name.');
      const res = await api.post('/seat-plans/rooms', {
        roomNo: roomNo.trim(),
        building: building.trim(),
        totalBenches: parseInt(totalBenches) || 15,
        seatsPerBench: parseInt(seatsPerBench) || 2,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Room created successfully!');
      setRoomNo('');
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create room');
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
  });

  // Auto Generate Mutation
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || selectedClassIds.length === 0) {
        throw new Error('Please select an Exam and at least one Class');
      }
      const targetRoomIds = selectedRoomIdsForAllocation.length > 0
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

  // Clear Seat Plan for this Shift Mutation
  const clearShiftSeatPlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) return;
      const res = await api.delete(`/seat-plans/exam/${selectedExamId}?shift=${encodeURIComponent(selectedShift)}`);
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

  const printDoorNotice = () => {
    if (!seatPlansData || seatPlansData.length === 0) {
      toast.error('No seat plan to print');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const examName = currentExam?.nameNepali || currentExam?.name || 'Examination';
    const shiftInfo = examShifts.find((s: any) => s.name === selectedShift);
    const shiftLabel = shiftInfo
      ? `${shiftInfo.nameNepali || shiftInfo.name} (${shiftInfo.startTime || ''} - ${shiftInfo.endTime || ''})`
      : `${selectedShift} SHIFT`;

    // Group seats by room
    const seatsByRoom: Record<string, any[]> = {};
    seatPlansData.forEach((s: any) => {
      const rName = s.room ? `Room ${s.room.roomNo} (${s.room.building || 'Main Block'})` : 'Exam Room';
      if (!seatsByRoom[rName]) seatsByRoom[rName] = [];
      seatsByRoom[rName].push(s);
    });

    const roomSections = Object.entries(seatsByRoom).map(([rName, seats]) => {
      const rows = seats.map((s) => `
        <tr>
          <td style="border: 1px solid #1e3a5f; padding: 5px; text-align: center; font-weight: bold;">${s.benchNo}</td>
          <td style="border: 1px solid #1e3a5f; padding: 5px; text-align: center; font-weight: bold; background: #f8fafc;">${s.seatPosition}</td>
          <td style="border: 1px solid #1e3a5f; padding: 5px; font-weight: bold;">${s.student?.fullName || '—'}</td>
          <td style="border: 1px solid #1e3a5f; padding: 5px; text-align: center; font-weight: bold; color: #1e3a5f;">${s.student?.classEnrollment?.[0]?.class?.name || '—'}</td>
          <td style="border: 1px solid #1e3a5f; padding: 5px; text-align: center; font-family: monospace; font-weight: bold;">${s.rollNo || '—'}</td>
          <td style="border: 1px solid #1e3a5f; padding: 5px; text-align: center; font-family: monospace;">${s.student?.studentId || '—'}</td>
        </tr>
      `).join('');

      return `
        <div style="page-break-after: always; padding: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 900; color: #1e3a5f;">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div style="font-size: 13px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${examName} — परीक्षा कोठा सिट योजना (Door Notice)</div>
            <div style="font-size: 12px; font-weight: bold; color: #0284c7; margin-top: 3px;">
              ⏱️ सत्र (Shift): ${shiftLabel}
            </div>
            <div style="font-size: 14px; font-weight: 900; background: #fef3c7; color: #78350f; display: inline-block; padding: 3px 16px; border-radius: 4px; margin-top: 6px;">
              ${rName} • कुल विद्यार्थी: ${seats.length} जना
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #1e3a5f; color: #fff;">
                <th style="padding: 6px; border: 1px solid #1e3a5f; width: 60px;">Bench No</th>
                <th style="padding: 6px; border: 1px solid #1e3a5f; width: 60px;">Position</th>
                <th style="padding: 6px; border: 1px solid #1e3a5f;">Student Name</th>
                <th style="padding: 6px; border: 1px solid #1e3a5f; width: 90px;">Class</th>
                <th style="padding: 6px; border: 1px solid #1e3a5f; width: 60px;">Roll No</th>
                <th style="padding: 6px; border: 1px solid #1e3a5f; width: 90px;">Student ID</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
            <div>Room Invigilator (निरीक्षक)</div>
            <div>Exam Controller (परीक्षा प्रमुख)</div>
            <div>Headmaster / Seal (प्रधानाध्यापक)</div>
          </div>
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Door Notice - ${examName} (${selectedShift})</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
          </style>
        </head>
        <body>
          ${roomSections}
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const totalSchoolBenches = rooms.reduce((sum, r) => sum + (r.totalBenches || 0), 0);
  const totalSchoolCapacity = rooms.reduce((sum, r) => sum + (r.totalCapacity || r.totalBenches * 2), 0);
  const seatPlans = seatPlansData || [];

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
            <Grid className="text-[#1e3a5f]" />
            <span>Room Plan & Shift-Wise Anti-Cheating Seat Allocation</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            कोठा तथा बेन्च योजना (Room & Desk Plan) तयार गरी प्रत्येक सत्रका लागि एकान्तर (Interleaved) सिट प्लान र ढोका टाँस निकाल्नुहोस्
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/exams/admit-cards"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
          >
            <Printer size={14} className="text-purple-600" />
            <span>Admit Cards (प्रवेश पत्र)</span>
          </Link>

          <button
            onClick={printDoorNotice}
            disabled={seatPlans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition shadow-2xs disabled:opacity-50"
          >
            <Printer size={14} />
            <span>Print Door Notice ({selectedShift})</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── STEP 1: ROOM & BENCH PLAN (कोठा तथा बेन्च योजना) ───────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border-2 border-blue-200/80 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
              १
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e3a5f] flex items-center gap-2 uppercase tracking-wide">
                <Building size={16} className="text-blue-700" />
                <span>STEP 1: Room Plan (कोठा तथा बेन्च व्यवस्थापन)</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-nepali">
                पहिले परीक्षा कोठा, भवन र त्यस कोठामा रहेका डेस्क/बेन्चको संख्या प्रविष्टि गर्नुहोस्
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-blue-50 border border-blue-200/80 px-3 py-1 font-bold text-[#1e3a5f] text-xs">
              कुल <strong>{rooms.length}</strong> कोठा • <strong>{totalSchoolBenches}</strong> बेन्च • <strong>{totalSchoolCapacity}</strong> सिट क्षमता/सत्र
            </span>
          </div>
        </div>

        {/* Quick Room Creator Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoomMutation.mutate();
          }}
          className="rounded-2xl bg-slate-50/90 border border-slate-200 p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Room No. / Room Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Room 101, Hall A, Science Wing"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                className="erp-input font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Building / Block</label>
              <input
                type="text"
                placeholder="e.g. Main Block"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="erp-input"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">No. of Benches *</label>
              <input
                required
                type="number"
                min="1"
                max="100"
                value={totalBenches}
                onChange={(e) => setTotalBenches(e.target.value)}
                className="erp-input font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Seats / Bench</label>
              <select
                value={seatsPerBench}
                onChange={(e) => setSeatsPerBench(e.target.value)}
                className="erp-input font-bold"
              >
                <option value="2">2 Seats (Left & Right)</option>
                <option value="3">3 Seats (L, M, R)</option>
                <option value="1">1 Seat (Single Desk)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-200/80">
            <div className="text-[11px] text-gray-600 font-nepali flex items-center gap-1">
              <span>अनुमानित क्षमता:</span>
              <strong className="text-blue-900 font-mono">
                {parseInt(totalBenches || '0') * parseInt(seatsPerBench || '2')}
              </strong>
              <span>जना विद्यार्थी प्रति सत्र</span>
            </div>

            <div className="flex items-center gap-2">
              {rooms.length === 0 && (
                <button
                  type="button"
                  disabled={seedRoomsMutation.isPending}
                  onClick={() => seedRoomsMutation.mutate()}
                  className="rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
                >
                  ⚡ Auto-Add Standard Rooms 1-5
                </button>
              )}

              <button
                type="submit"
                disabled={createRoomMutation.isPending || !roomNo.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Plus size={14} />
                <span>{createRoomMutation.isPending ? 'Adding...' : 'Add Exam Room (कोठा थप्नुहोस्)'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Configured Rooms Cards Grid */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
            हाल सिर्जना गरिएका परीक्षा कोठाहरू ({rooms.length} Rooms Available):
          </h3>

          {isRoomsLoading ? (
            <div className="py-6 text-center text-gray-400 text-xs">Loading exam rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-1">
              <Building size={28} className="mx-auto text-gray-300 mb-1" />
              <p className="font-bold text-gray-700">कुनै परीक्षा कोठा सिर्जना गरिएको छैन।</p>
              <p className="text-[11px]">माथिको फारम प्रयोग गरी वा &quot;Auto-Add Standard Rooms&quot; क्लिक गरी कोठा थप्नुहोस्।</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {rooms.map((r: any) => {
                const isSelectedForAllocation = selectedRoomIdsForAllocation.includes(r.id);
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-3 text-xs space-y-1.5 transition relative group ${
                      isSelectedForAllocation
                        ? 'border-blue-300 bg-blue-50/40'
                        : 'border-gray-200 bg-white opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-gray-900 font-extrabold text-sm">{r.roomNo}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${r.roomNo}?`)) {
                            deleteRoomMutation.mutate(r.id);
                          }
                        }}
                        title="Delete Room"
                        className="text-gray-400 hover:text-rose-600 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 truncate">{r.building || 'Main Block'}</p>

                    <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between font-mono text-[10px] font-bold">
                      <span className="text-gray-600">{r.totalBenches} Benches</span>
                      <span className="text-blue-700">{r.totalCapacity || r.totalBenches * 2} Seats</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                कुन परीक्षा र कुन शिफ्ट (बिहानी वा दिवा) का लागि सिट योजना बनाउने हो चयन गर्नुहोस्
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

        {/* Shift Selector Pills */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block font-bold text-gray-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>Choose Shift to Plan (कुन सत्रको सिट योजना बनाउने?):</span>
            </span>
            <span className="text-[11px] text-gray-500 font-normal">
              Rooms and benches are automatically reused across shifts without conflicts.
            </span>
          </label>

          <div className="flex flex-wrap gap-2.5">
            {examShifts.length > 0 ? (
              examShifts.map((sh: any) => {
                const isSelected = selectedShift === sh.name;
                const isMorning = (sh.name || '').toUpperCase().includes('MORN');
                return (
                  <button
                    key={sh.id || sh.name}
                    type="button"
                    onClick={() => setSelectedShift(sh.name)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-md scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isMorning ? (
                      <Sun size={14} className={isSelected ? 'text-amber-300' : 'text-amber-600'} />
                    ) : (
                      <Moon size={14} className={isSelected ? 'text-blue-200' : 'text-indigo-600'} />
                    )}
                    <span>{sh.nameNepali || sh.name}</span>
                    {(sh.startTime || sh.endTime) && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border'
                      }`}>
                        {sh.startTime} - {sh.endTime}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedShift('MORNING')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    selectedShift === 'MORNING'
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sun size={14} className="text-amber-500" />
                  <span>Morning Shift (बिहानी सत्र)</span>
                  <span className="text-[10px] opacity-80 font-mono">07:00 - 10:00 AM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShift('DAY')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    selectedShift === 'DAY'
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sun size={14} className="text-amber-500" />
                  <span>Day Shift (दिवा सत्र)</span>
                  <span className="text-[10px] opacity-80 font-mono">11:00 AM - 02:00 PM</span>
                </button>
              </>
            )}
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
                  className={`p-2 rounded-xl border text-center font-bold text-xs transition ${
                    isSelected
                      ? 'bg-blue-50 border-[#1e3a5f] text-[#1e3a5f] ring-1 ring-[#1e3a5f]'
                      : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Rooms for this Allocation */}
        <div className="space-y-2.5 pt-2.5 border-t border-gray-100 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <div>
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Building size={14} className="text-purple-700" />
                <span>Select Rooms for this Exam Shift (यस {selectedShift} शिफ्टका लागि प्रयोग गरिने कोठाहरू):</span>
              </label>
              <p className="text-[10px] text-gray-500 font-nepali">
                यस सत्रमा कुन-कुन कोठामा विद्यार्थी राख्ने हो छनौट गर्नुहोस् (अनचेक गरिएका कोठाहरूमा विद्यार्थी राखिने छैन)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRoomIdsForAllocation(rooms.map((r: any) => r.id))}
                className="text-blue-600 hover:underline font-bold text-[10.5px]"
              >
                Select All Rooms
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedRoomIdsForAllocation([])}
                className="text-gray-500 hover:underline font-bold text-[10.5px]"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {rooms.map((r: any) => {
              const isChecked = selectedRoomIdsForAllocation.includes(r.id);
              const roomCap = r.totalCapacity || r.totalBenches * (r.seatsPerBench || 2);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleToggleRoomForAllocation(r.id)}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                    isChecked
                      ? 'bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-600/30 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs truncate text-gray-900">{r.roomNo}</span>
                    <span className={`h-4 w-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      isChecked ? 'bg-purple-700 text-white' : 'border border-gray-300 bg-white'
                    }`}>
                      {isChecked ? '✓' : ''}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 truncate">{r.building || 'Main Block'}</p>

                  <div className="pt-1 border-t border-purple-100 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-gray-500">{r.totalBenches} Desks</span>
                    <span className="font-bold text-purple-800">{roomCap} Seats</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Capacity Status Badge */}
          {selectedRoomIdsForAllocation.length > 0 && (
            <div className="rounded-xl bg-purple-100/60 border border-purple-200 p-2.5 flex items-center justify-between text-[11px] text-purple-950 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>
                  छानिएका <strong>{selectedRoomIdsForAllocation.length}</strong> वटा कोठामा जम्मा{' '}
                  <strong className="font-mono text-purple-900">
                    {rooms
                      .filter((r: any) => selectedRoomIdsForAllocation.includes(r.id))
                      .reduce((sum: number, r: any) => sum + (r.totalCapacity || r.totalBenches * (r.seatsPerBench || 2)), 0)}
                  </strong>{' '}
                  सिट क्षमता उपलब्ध छ।
                </span>
              </div>
              <span className="text-[10px] bg-white border border-purple-300 px-2 py-0.5 rounded-md font-bold text-purple-900 font-mono">
                {selectedShift} SHIFT READY
              </span>
            </div>
          )}
        </div>

        {/* Generate Button Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="text-[11px] text-gray-500 font-nepali">
            💡 प्रणालीले एकापसमा नजिक नहुने गरी (Anti-cheating) बायाँ र दायाँ बेन्चमा फरक कक्षाका विद्यार्थीहरूलाई
            स्वचालित रूपमा मिलाउँछ।
          </div>

          <button
            type="button"
            disabled={
              autoGenerateMutation.isPending ||
              !selectedExamId ||
              selectedClassIds.length === 0 ||
              rooms.length === 0
            }
            onClick={() => autoGenerateMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-6 py-2.5 font-bold text-white shadow-md hover:from-purple-800 hover:to-blue-800 transition disabled:opacity-50 text-xs shrink-0"
          >
            {autoGenerateMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Allocating Seats for {selectedShift}...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Smart {selectedShift} Seat Plan (सिट योजना तयार गर्नुहोस्)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ─── STEP 3: VISUAL LAYOUT & BENCH CARDS ────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
              ३
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Layers size={16} className="text-emerald-700" />
                <span>STEP 3: Visual Bench & Door Plan — {selectedShift} Shift</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-nepali">
                प्रत्येक कोठा र बेन्च अनुसार विद्यार्थीहरूको सिट नक्सा
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-900 text-xs">
              Total Seated: <strong>{seatPlans.length}</strong> Students
            </span>
          </div>
        </div>

        {isSeatsLoading ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2 text-xs">Loading seat plans for {selectedShift} shift...</p>
          </div>
        ) : seatPlans.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-12 text-center space-y-3">
            <Grid size={36} className="mx-auto text-gray-300" />
            <h3 className="text-sm font-bold text-gray-700">No Seat Plan Generated for {selectedShift} Shift Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Select an exam, choose the shift ({selectedShift}), check classes above, then click &quot;Generate Smart {selectedShift} Seat Plan&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seatPlans.map((seat: any) => (
              <div
                key={seat.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-blue-400 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#1e3a5f]">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {seat.room?.roomNo || 'Room 1'}
                    </span>
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px]">
                      Bench #{seat.benchNo}
                    </span>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      seat.seatPosition === 'LEFT'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {seat.seatPosition} SEAT
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="font-extrabold text-gray-900 text-sm">{seat.student?.fullName}</p>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Class: {seat.student?.classEnrollment?.[0]?.class?.name || '—'} (Roll: {seat.rollNo || '—'})
                  </p>
                  <p className="text-[10px] font-mono text-gray-400">EMIS ID: {seat.student?.studentId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
