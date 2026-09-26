'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Sparkles,
  Building,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  Search,
  BadgeCheck,
  FileCheck,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExamAttendancePortalProps {
  initialExamId?: string | number;
}

export default function ExamAttendancePortal({ initialExamId }: ExamAttendancePortalProps) {
  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId ? String(initialExamId) : '');
  const [selectedDateBs, setSelectedDateBs] = useState<string>(todayBS());
  const [selectedShift, setSelectedShift] = useState<string>('DAY');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Local attendance state for the loaded roster: { [studentId]: { status: 'PRESENT'|'ABSENT'|'LATE'|'EXPELLED', bookletNo: '', remarks: '' } }
  const [rosterAttendance, setRosterAttendance] = useState<Record<number, { status: string; bookletNo: string; remarks: string }>>({});

  // Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Default to first exam if none selected
  useEffect(() => {
    if (examsData?.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].id.toString());
    }
  }, [examsData, selectedExamId]);

  const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);

  // Fetch Rooms
  const { data: roomsData } = useQuery({
    queryKey: ['exam-rooms'],
    queryFn: async () => {
      const res = await api.get('/seat-plans/rooms');
      return res.data?.data || [];
    },
  });

  const rooms: any[] = roomsData || [];

  // Default to first room if none selected
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id.toString());
    }
  }, [rooms, selectedRoomId]);

  // Available shifts for this exam
  const examShifts = currentExam?.shifts || [];
  const availableShifts = useMemo(() => {
    const list = [
      { name: 'MORNING', nameNepali: 'बिहानी सत्र (Morning Shift)', timing: '07:00 AM - 10:00 AM' },
      { name: 'DAY', nameNepali: 'दिवा सत्र (Day Shift)', timing: '11:00 AM - 02:00 PM' },
      { name: 'EVENING', nameNepali: 'साँझ सत्र (Evening Shift)', timing: '03:00 PM - 06:00 PM' },
    ];
    if (examShifts.length > 0) {
      examShifts.forEach((s: any) => {
        const idx = list.findIndex((x) => x.name === s.name);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            nameNepali: s.nameNepali || list[idx].nameNepali,
            timing: s.startTime ? `${s.startTime} - ${s.endTime}` : list[idx].timing,
          };
        } else {
          list.push({
            name: s.name,
            nameNepali: s.nameNepali || s.name,
            timing: `${s.startTime || ''} - ${s.endTime || ''}`.trim(),
          });
        }
      });
    }
    return list;
  }, [examShifts]);

  // Fetch Room Attendance Roster from Backend
  const { data: attendanceData, isLoading: isRosterLoading } = useQuery({
    queryKey: ['exam-attendance', selectedExamId, selectedDateBs, selectedShift, selectedRoomId],
    queryFn: async () => {
      if (!selectedExamId || !selectedDateBs || !selectedRoomId) return null;
      const params = new URLSearchParams({
        dateBs: selectedDateBs,
        shift: selectedShift,
        roomId: selectedRoomId,
      });
      const res = await api.get(`/exams/${selectedExamId}/attendance?${params.toString()}`);
      return res.data?.data || null;
    },
    enabled: !!selectedExamId && !!selectedDateBs && !!selectedRoomId,
  });

  const studentsRoster: any[] = attendanceData?.students || [];

  // Populate local attendance state when backend data arrives
  useEffect(() => {
    if (studentsRoster && studentsRoster.length > 0) {
      const initialMap: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
      studentsRoster.forEach((s) => {
        initialMap[s.studentId] = {
          status: s.status || 'PRESENT',
          bookletNo: s.bookletNo || '',
          remarks: s.remarks || '',
        };
      });
      setRosterAttendance(initialMap);
    } else {
      setRosterAttendance({});
    }
  }, [studentsRoster]);

  // Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !selectedDateBs || !selectedRoomId) {
        throw new Error('Please select Exam, Date, and Room.');
      }
      if (studentsRoster.length === 0) {
        throw new Error('No students seated in this room to record attendance for.');
      }

      const attendanceList = studentsRoster.map((s) => {
        const local = rosterAttendance[s.studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' };
        return {
          studentId: s.studentId,
          classId: s.classId,
          subjectId: s.subjectId,
          status: local.status,
          bookletNo: local.bookletNo,
          remarks: local.remarks,
        };
      });

      const res = await api.post(`/exams/${selectedExamId}/attendance`, {
        dateBs: selectedDateBs,
        shift: selectedShift,
        roomId: parseInt(selectedRoomId),
        attendanceList,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Exam attendance saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save attendance');
    },
  });

  // Helpers to update individual student attendance
  const setStudentStatus = (studentId: number, status: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        status,
      },
    }));
  };

  const setStudentBookletNo = (studentId: number, bookletNo: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        bookletNo,
      },
    }));
  };

  const setStudentRemarks = (studentId: number, remarks: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        remarks,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
    studentsRoster.forEach((s) => {
      updated[s.studentId] = {
        ...(rosterAttendance[s.studentId] || { bookletNo: '', remarks: '' }),
        status: 'PRESENT',
      };
    });
    setRosterAttendance(updated);
    toast.success('All students marked as Present!');
  };

  // Filter students by search
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return studentsRoster;
    const q = searchQuery.toLowerCase().trim();
    return studentsRoster.filter((s) => {
      return (
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentCode || '').toLowerCase().includes(q) ||
        (s.className || '').toLowerCase().includes(q) ||
        (s.subjectName || '').toLowerCase().includes(q) ||
        String(s.rollNo || '').includes(q) ||
        String(s.benchNo || '').includes(q)
      );
    });
  }, [studentsRoster, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let expelled = 0;

    studentsRoster.forEach((s) => {
      const st = rosterAttendance[s.studentId]?.status || 'PRESENT';
      if (st === 'ABSENT') absent++;
      else if (st === 'LATE') late++;
      else if (st === 'EXPELLED') expelled++;
      else present++;
    });

    const total = studentsRoster.length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

    return { total, present, absent, late, expelled, rate };
  }, [studentsRoster, rosterAttendance]);

  // Print Attendance Sheet (प्रवेश परीक्षा / हाजिरी फारम)
  const printAttendanceSheet = () => {
    if (studentsRoster.length === 0) {
      toast.error('No attendance roster to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? `${currentExam.name} (${currentExam.nameNepali || ''})` : 'Examination';
    const roomInfo = rooms.find((r) => r.id.toString() === selectedRoomId);
    const shiftInfo = availableShifts.find((s) => s.name === selectedShift);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Attendance Sheet - ${examTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: sans-serif; font-size: 10.5px; margin: 0; padding: 0; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
          .school-name { font-size: 15px; font-weight: bold; color: #1e3a5f; }
          .sheet-title { font-size: 12px; font-weight: bold; margin-top: 2px; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
          th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; }
          th { background: #e2e8f0; font-weight: bold; }
          .present { color: #166534; font-weight: bold; }
          .absent { color: #991b1b; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 10px; }
          .sig-box { text-align: center; border-top: 1px dashed #333; width: 180px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">श्री नेपाल माध्यमिक विद्यालय (NEPAL SECONDARY SCHOOL)</div>
          <div class="sheet-title">परीक्षा कोठा हाजिरी फारम (EXAM ROOM ATTENDANCE ROSTER)</div>
        </div>

        <div class="meta-grid">
          <div><strong>परीक्षा (Exam):</strong> ${examTitle}</div>
          <div><strong>मिति (Date):</strong> ${selectedDateBs} BS</div>
          <div><strong>सत्र (Shift):</strong> ${shiftInfo?.nameNepali || selectedShift}</div>
          <div><strong>कोठा (Room):</strong> ${roomInfo?.roomNo || ''} (${roomInfo?.building || ''})</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">SN</th>
              <th style="width: 70px;">Bench / Seat</th>
              <th style="width: 50px;">Roll No</th>
              <th>Student Name</th>
              <th style="width: 60px;">Class</th>
              <th>Subject (विषय)</th>
              <th style="width: 80px;">Booklet No</th>
              <th style="width: 60px; text-align: center;">Status</th>
              <th style="width: 80px;">Student Sign</th>
            </tr>
          </thead>
          <tbody>
            ${studentsRoster
              .map((s, idx) => {
                const st = rosterAttendance[s.studentId]?.status || 'PRESENT';
                const bNo = rosterAttendance[s.studentId]?.bookletNo || s.bookletNo || '';
                return `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><strong>B-${s.benchNo}</strong> (${s.seatPosition})</td>
                    <td><strong>${s.rollNo || '-'}</strong></td>
                    <td><strong>${s.fullName}</strong></td>
                    <td>${s.className}</td>
                    <td>${s.subjectName}</td>
                    <td>${bNo}</td>
                    <td style="text-align: center;" class="${st === 'ABSENT' ? 'absent' : 'present'}">${st}</td>
                    <td></td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <div style="font-size: 10px; margin-bottom: 20px;">
          <strong>उपस्थिति सारांश:</strong> कुल सिट: ${stats.total} | उपस्थित (Present): ${stats.present} | अनुपस्थित (Absent): ${stats.absent}
        </div>

        <div class="signatures">
          <div class="sig-box">निरीक्षकको दस्तखत (Invigilator Sign)</div>
          <div class="sig-box">परीक्षा संयोजक (Exam In-charge)</div>
          <div class="sig-box">प्रधानाध्यापक (Headmaster)</div>
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
    <div className="space-y-5">
      {/* ─── HEADER & FILTER BAR ────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
              <CheckSquare size={20} className="text-blue-600" />
              <span>Room-Wise Exam Attendance Portal (परीक्षा कोठा हाजिरी)</span>
            </h2>
            <p className="text-xs text-gray-500 font-nepali mt-0.5">
              प्रत्येक कोठाका निरीक्षक शिक्षकले लिने प्रत्यक्ष हाजिरी &bull; अनुपस्थित (Absent) विद्यार्थीको अङ्क प्रविष्टिमा स्वतः Absent सिंक हुन्छ।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={printAttendanceSheet}
              disabled={studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
            >
              <Printer size={14} className="text-blue-600" />
              <span>Print Attendance Roster (प्रिन्ट)</span>
            </button>

            <button
              type="button"
              onClick={markAllPresent}
              disabled={studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-900 transition shadow-2xs disabled:opacity-40"
            >
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>Mark All Present (सबै उपस्थित)</span>
            </button>

            <button
              type="button"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending || studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance (हाजिरी सुरक्षित)'}</span>
            </button>
          </div>
        </div>

        {/* ── Selection Dropdowns ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Exam Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Examination *</label>
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

          {/* Exam Date BS */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Date (BS) *</label>
            <input
              type="text"
              required
              value={selectedDateBs}
              onChange={(e) => setSelectedDateBs(e.target.value)}
              placeholder="e.g. 2083-05-15"
              className="erp-input font-mono font-bold"
            />
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Shift (सत्र) *</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="erp-input font-bold"
            >
              {availableShifts.map((sh) => (
                <option key={sh.name} value={sh.name}>
                  {sh.nameNepali} ({sh.timing})
                </option>
              ))}
            </select>
          </div>

          {/* Room Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Room (परीक्षा कोठा) *</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="erp-input font-bold text-blue-900"
            >
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.roomNo} ({r.building || 'Main Block'} &bull; {r.totalCapacity || r.totalBenches * 2} Seats)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Attendance Stats Metrics */}
        {studentsRoster.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 font-mono text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/70 text-center">
              <span className="text-[10.5px] text-gray-500 block">कुल सिट (Total Seated)</span>
              <span className="text-base font-black text-gray-900">{stats.total}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200 text-center">
              <span className="text-[10.5px] text-emerald-800 font-bold block">🟢 उपस्थित (Present)</span>
              <span className="text-base font-black text-emerald-700">{stats.present}</span>
            </div>
            <div className="rounded-xl bg-rose-50 p-2.5 border border-rose-200 text-center">
              <span className="text-[10.5px] text-rose-800 font-bold block">🔴 अनुपस्थित (Absent)</span>
              <span className="text-base font-black text-rose-700">{stats.absent}</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-center">
              <span className="text-[10.5px] text-amber-800 font-bold block">🟡 ढिलो (Late)</span>
              <span className="text-base font-black text-amber-700">{stats.late}</span>
            </div>
            <div className="rounded-xl bg-purple-50 p-2.5 border border-purple-200 text-center">
              <span className="text-[10.5px] text-purple-800 font-bold block">📊 उपस्थिति दर (Rate)</span>
              <span className="text-base font-black text-purple-900">{stats.rate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── STUDENTS ATTENDANCE ROSTER TABLE ─────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck size={18} className="text-blue-600" />
            <h3 className="text-sm font-extrabold text-gray-900">
              Exam Roster for {rooms.find((r) => r.id.toString() === selectedRoomId)?.roomNo || 'Room'} &bull; {selectedShift} Shift
            </h3>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll, bench..."
              className="erp-input pl-8 py-1.5 text-xs font-medium w-full"
            />
          </div>
        </div>

        {isRosterLoading ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2">Loading seated students for this room and shift...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-2">
            <AlertTriangle className="mx-auto text-amber-500" size={30} />
            <p className="text-xs font-bold text-gray-700">No Seated Students Found in this Room for {selectedShift} Shift</p>
            <p className="text-[11px] text-gray-400 max-w-md mx-auto">
              Please make sure seat planning has been generated for this exam and shift in &quot;Seat Planning&quot; console, and that this room is selected.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e3a5f] text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3">Bench / Seat</th>
                  <th className="py-2.5 px-2">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-2.5">Class</th>
                  <th className="py-2.5 px-3">Subject (आजको विषय)</th>
                  <th className="py-2.5 px-3 text-center">Attendance Status</th>
                  <th className="py-2.5 px-3">Booklet No (उत्तरपुस्तिका नं)</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoster.map((s, idx) => {
                  const currentStatus = rosterAttendance[s.studentId]?.status || 'PRESENT';
                  const currentBookletNo = rosterAttendance[s.studentId]?.bookletNo || '';
                  const currentRemarks = rosterAttendance[s.studentId]?.remarks || '';

                  const isAbsent = currentStatus === 'ABSENT';
                  const isLate = currentStatus === 'LATE';
                  const isExpelled = currentStatus === 'EXPELLED';

                  return (
                    <tr
                      key={s.studentId}
                      className={`hover:bg-slate-50/80 transition ${
                        isAbsent ? 'bg-rose-50/40' : isLate ? 'bg-amber-50/30' : isExpelled ? 'bg-red-100/50' : ''
                      }`}
                    >
                      {/* Bench & Seat */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          B-{s.benchNo} &bull; {s.seatPosition}
                        </span>
                      </td>

                      {/* Roll No */}
                      <td className="py-2.5 px-2 font-mono font-bold text-gray-700">
                        {s.rollNo || '—'}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-3">
                        <p className="font-extrabold text-gray-900">{s.fullName}</p>
                        <p className="text-[10px] font-mono text-gray-400">{s.studentCode || ''}</p>
                      </td>

                      {/* Class */}
                      <td className="py-2.5 px-2.5 font-bold text-blue-900">
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200 text-[10.5px]">
                          {s.className}
                        </span>
                      </td>

                      {/* Subject on Date */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-purple-900 text-[11px]">
                          {s.subjectName}
                        </span>
                      </td>

                      {/* Attendance Buttons */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition cursor-pointer ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'LATE')}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                              isLate
                                ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-500 hover:bg-slate-200'
                            }`}
                          >
                            Late
                          </button>
                        </div>
                      </td>

                      {/* Booklet Number */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={currentBookletNo}
                          disabled={isAbsent}
                          onChange={(e) => setStudentBookletNo(s.studentId, e.target.value)}
                          placeholder={isAbsent ? 'Absent' : 'e.g. 10492'}
                          className="erp-input font-mono text-[11px] py-1 px-2 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={currentRemarks}
                          onChange={(e) => setStudentRemarks(s.studentId, e.target.value)}
                          placeholder="Remarks..."
                          className="erp-input text-[11px] py-1 px-2"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Save Bar */}
        {studentsRoster.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 font-nepali">
              💡 हाजिरी सेभ गर्दा अनुपस्थित (Absent) विद्यार्थीहरूको अङ्क तालिका (Mark Entry) मा स्वतः Absent सेट हुन्छ।
            </p>

            <button
              type="button"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saveAttendanceMutation.isPending ? 'Saving...' : 'Save Exam Attendance (हाजिरी सुरक्षित)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
