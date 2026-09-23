'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ExamSeatPlanningPage() {
  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

  // New Room Form
  const [newRoom, setNewRoom] = useState({
    roomNo: '',
    building: 'Main Block',
    totalBenches: '15',
    seatsPerBench: '2',
  });

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
  const { data: roomsData } = useQuery({
    queryKey: ['exam-rooms'],
    queryFn: async () => {
      const res = await api.get('/seat-plans/rooms');
      return res.data?.data || [];
    },
  });

  // Fetch Seat Plan for selected exam and room
  const { data: seatPlansData, isLoading: isSeatsLoading } = useQuery({
    queryKey: ['seat-plans', selectedExamId, selectedRoomId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const params = new URLSearchParams();
      params.append('examId', selectedExamId);
      if (selectedRoomId) params.append('roomId', selectedRoomId);
      const res = await api.get(`/seat-plans?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  // Create Room Mutation
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/seat-plans/rooms', newRoom);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Room created!');
      setIsAddRoomModalOpen(false);
      setNewRoom({ roomNo: '', building: 'Main Block', totalBenches: '15', seatsPerBench: '2' });
      queryClient.invalidateQueries({ queryKey: ['exam-rooms'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create room');
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
      const allRoomIds = roomsData?.map((r: any) => r.id) || [];
      if (allRoomIds.length === 0) {
        throw new Error('Please add at least one Exam Room first');
      }

      const res = await api.post('/seat-plans/auto-generate', {
        examId: parseInt(selectedExamId),
        roomIds: allRoomIds,
        classIds: selectedClassIds,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Smart seat allocation complete!');
      queryClient.invalidateQueries({ queryKey: ['seat-plans'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate seat plan');
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

    const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);
    const examName = currentExam?.nameNepali || currentExam?.name || 'Examination';

    // Group seats by room
    const seatsByRoom: Record<string, any[]> = {};
    seatPlansData.forEach((s: any) => {
      const rName = s.room ? `Room ${s.room.roomNo} (${s.room.building || 'Main Block'})` : 'Exam Room';
      if (!seatsByRoom[rName]) seatsByRoom[rName] = [];
      seatsByRoom[rName].push(s);
    });

    const roomSections = Object.entries(seatsByRoom).map(([rName, seats]) => {
      const rows = seats.map((s, idx) => `
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
            <div style="font-size: 14px; font-weight: 900; background: #fef3c7; color: #78350f; display: inline-block; padding: 2px 14px; border-radius: 4px; margin-top: 4px;">
              ${rName} • कुल विद्यार्थी: ${seats.length}
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
            <div>Exam Controller (परीक्षा नियन्त्रक)</div>
            <div>Headmaster / Seal (प्रधानाध्यापक)</div>
          </div>
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Door Notice - ${examName}</title>
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

  const rooms = roomsData || [];
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
            <span>Anti-Cheating Exam Seat Planning (परीक्षा सिट योजना)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            कोठा क्षमता, बेन्च व्यवस्थापन, फरक कक्षाका विद्यार्थीहरूलाई एकान्तर (Interleaved) सिट प्लान र ढोका सूचना
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
            <span>Print Door Notice (ढोका टाँस)</span>
          </button>

          <button
            onClick={() => setIsAddRoomModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs"
          >
            <Plus size={14} />
            <span>Add Exam Room (कोठा थप्नुहोस्)</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Exam & Class Selection */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <Sparkles size={15} className="text-amber-500" />
          <span>Smart Auto Allocation Settings (स्वचालित सिट योजना सेटिङ)</span>
        </h2>

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
            <label className="block font-bold text-gray-700 mb-1">Filter by Room View:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="erp-input font-medium"
            >
              <option value="">All Exam Rooms (सबै कोठा)</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNo} ({r.totalBenches} benches, {r.totalCapacity || r.totalBenches * 2} capacity)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-class checklist for interleaving */}
        <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-700">
              Select Classes to Interleave (एकै सिटमा मिलाउने कक्षाहरू):
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

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-[11px] text-gray-500 font-nepali">
            💡 प्रणालीले एकापसमा नजिक नहुने गरी (Anti-cheating) बायाँ र दायाँ बेन्चमा फरक कक्षाका विद्यार्थीहरूलाई
            स्वचालित रूपमा मिलाउँछ।
          </div>

          <button
            type="button"
            disabled={autoGenerateMutation.isPending || !selectedExamId || selectedClassIds.length === 0}
            onClick={() => autoGenerateMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-2.5 font-bold text-white shadow-md hover:from-blue-800 hover:to-indigo-800 transition disabled:opacity-50 text-xs"
          >
            {autoGenerateMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Generating Interleaved Seats...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Smart Seat Plan (सिट योजना तयार गर्नुहोस्)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Benches Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} />
            <span>Room & Bench Visual Layout (कोठा तथा बेन्च सिट नक्सा)</span>
          </h2>
          <span className="text-xs font-bold text-gray-600">
            Total Seated: <strong className="text-[#1e3a5f]">{seatPlans.length}</strong> Students
          </span>
        </div>

        {isSeatsLoading ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2 text-xs">Loading seat plans...</p>
          </div>
        ) : seatPlans.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center space-y-3">
            <Grid size={36} className="mx-auto text-gray-300" />
            <h3 className="text-sm font-bold text-gray-700">No Seat Plan Generated Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Select an exam and classes above, then click "Generate Smart Seat Plan" to allocate seats.
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
                      Room {seat.room?.roomNo || '1'}
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
                  <p className="text-[10px] font-mono text-gray-400">ID: {seat.student?.studentId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL: ADD EXAM ROOM ─────────────────────────────────────────── */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                <Building size={16} />
                <span>Add Exam Room (नयाँ परीक्षा कोठा)</span>
              </h3>
              <button onClick={() => setIsAddRoomModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Room Number / Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 101, Hall A"
                  value={newRoom.roomNo}
                  onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Building / Block</label>
                <input
                  type="text"
                  placeholder="Main Block / Science Block"
                  value={newRoom.building}
                  onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Total Benches *</label>
                  <input
                    required
                    type="number"
                    value={newRoom.totalBenches}
                    onChange={(e) => setNewRoom({ ...newRoom, totalBenches: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Seats per Bench</label>
                  <input
                    type="number"
                    value={newRoom.seatsPerBench}
                    onChange={(e) => setNewRoom({ ...newRoom, seatsPerBench: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddRoomModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createRoomMutation.isPending || !newRoom.roomNo}
                onClick={() => createRoomMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
              >
                {createRoomMutation.isPending ? 'Saving...' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
