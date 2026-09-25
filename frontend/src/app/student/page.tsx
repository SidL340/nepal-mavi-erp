'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import StudentPhotoUploadModal from '@/components/StudentPhotoUploadModal';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  Receipt,
  BookOpen,
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  Printer,
  Search,
  School,
  Sparkles,
  Globe,
  ExternalLink,
  Phone,
  MapPin,
  Heart,
  BookMarked,
  User,
  ShieldCheck,
  X,
  ChevronRight,
  TrendingUp,
  Download,
  Camera,
  Upload,
} from 'lucide-react';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

const DAYS_MAP: Record<number, string> = {
  1: 'आइतबार (Sunday)',
  2: 'सोमबार (Monday)',
  3: 'मंगलबार (Tuesday)',
  4: 'बुधबार (Wednesday)',
  5: 'बिहीबार (Thursday)',
  6: 'शुक्रबार (Friday)',
  7: 'शनिबार (Saturday)',
};

const SHORT_DAYS_MAP: Record<number, string> = {
  1: 'आइत (Sun)',
  2: 'सोम (Mon)',
  3: 'मंगल (Tue)',
  4: 'बुध (Wed)',
  5: 'बिही (Thu)',
  6: 'शुक्र (Fri)',
  7: 'शनि (Sat)',
};

// Helper for generating standard Symbol No in format: 2083<Class2d><Roll2d>
function generateSymbolNo(year?: string, className?: string, rollNo?: number | string) {
  const y = (year || '2083').replace(/\D/g, '').slice(-4) || '2083';
  const numMatch = (className || '').match(/\d+/);
  const classNum = numMatch ? parseInt(numMatch[0], 10) : 10;
  const c = String(classNum).padStart(2, '0');
  const r = String(rollNo || 1).padStart(2, '0');
  return `${y}${c}${r}`;
}

export default function StudentPortalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const studentId = user?.student?.id;

  // Active Tab: overview | attendance | exams | fees | library | notices | idcard | routine
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || 'overview');

  const todayDayNum = React.useMemo(() => new Date().getDay() + 1, []); // 1 (Sun) to 7 (Sat)
  const [selectedRoutineDay, setSelectedRoutineDay] = useState<number>(() => {
    return new Date().getDay() + 1;
  });
  const [routineViewMode, setRoutineViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Selected Exam for Marksheet/Routine view
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examViewSubTab, setExamViewSubTab] = useState<'routine' | 'marksheet'>('routine');

  // Selected Fee Receipt for modal view/print
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any>(null);

  // Photo upload modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Library search state
  const [librarySearch, setLibrarySearch] = useState('');
  const [noticeFilter, setNoticeFilter] = useState('ALL');

  // Leave Form State
  const [leaveStartDate, setLeaveStartDate] = useState(todayBS());
  const [leaveEndDate, setLeaveEndDate] = useState(todayBS());
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Edit Leave State
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [isEditLeaveModalOpen, setIsEditLeaveModalOpen] = useState(false);
  const [editLeaveStartDate, setEditLeaveStartDate] = useState('');
  const [editLeaveEndDate, setEditLeaveEndDate] = useState('');
  const [editLeaveDaysCount, setEditLeaveDaysCount] = useState(1);
  const [editLeaveReason, setEditLeaveReason] = useState('');

  // Daily Lessons & Homework State
  const [lessonsDateBs, setLessonsDateBs] = useState<string>(todayBS());

  // ── 0. Fetch Daily Lessons & Homework for Student's Class ──
  const { data: studentLessonsData, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['student-daily-lessons', lessonsDateBs],
    queryFn: async () => {
      const res = await api.get(`/daily-logs?dateBs=${lessonsDateBs}`);
      return res.data?.data?.logs || [];
    },
  });

  // ── 1. Fetch Student Profile ──
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['student-me', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get(`/students/${studentId}`);
      return res.data?.data;
    },
    enabled: !!studentId,
  });

  // ── 2. Fetch School Profile & Branding ──
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // ── 3. Fetch Active Academic Year ──
  const { data: activeYear } = useQuery({
    queryKey: ['academic-year-active'],
    queryFn: async () => {
      const res = await api.get('/school/academic-years/active');
      return res.data?.data;
    },
  });

  // ── 4. Fetch Active Exams ──
  // ── 4. Fetch Active Exams ──
  const { data: examsData } = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => {
      try {
        const res = await api.get('/exams/active');
        if (res.data?.data && res.data.data.length > 0) return res.data.data;
      } catch (err) {}
      const fallback = await api.get('/exams');
      return fallback.data?.data || [];
    },
  });

  // Auto-select first exam when exams load
  useEffect(() => {
    if (examsData?.length > 0) {
      if (!selectedExamId || !examsData.some((e: any) => e.id === selectedExamId)) {
        setSelectedExamId(examsData[0].id);
      }
    }
  }, [examsData, selectedExamId]);

  // ── 5. Fetch Marksheet for Selected Exam ──
  const { data: marksheetData, isLoading: isMarksheetLoading } = useQuery({
    queryKey: ['student-marksheet', selectedExamId, studentId],
    queryFn: async () => {
      if (!selectedExamId || !studentId) return null;
      const res = await api.get(`/exams/${selectedExamId}/marksheet/${studentId}`);
      return res.data?.data;
    },
    enabled: !!selectedExamId && !!studentId,
  });

  // ── 5.1 Fetch Seat Plan for Selected Exam & Student ──
  const { data: studentSeatPlanData, isLoading: isStudentSeatLoading } = useQuery({
    queryKey: ['student-seat-plan', selectedExamId, studentId],
    queryFn: async () => {
      if (!selectedExamId || !studentId) return null;
      const res = await api.get(`/seat-plans?examId=${selectedExamId}&studentId=${studentId}`);
      return res.data?.data?.[0] || null;
    },
    enabled: !!selectedExamId && !!studentId,
  });

  // ── 6. Fetch Notices ──
  const { data: noticesData } = useQuery({
    queryKey: ['student-notices'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // ── 7. Fetch Library Issues ──
  const { data: libraryIssues } = useQuery({
    queryKey: ['student-library-issues', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const res = await api.get(`/library/issues?studentId=${studentId}`);
      return res.data?.data || [];
    },
    enabled: !!studentId,
  });

  // ── 8. Fetch Library Catalogue ──
  const { data: libraryBooks } = useQuery({
    queryKey: ['student-library-books', librarySearch],
    queryFn: async () => {
      const res = await api.get(`/library?search=${encodeURIComponent(librarySearch)}`);
      return res.data?.data || [];
    },
  });

  const [isOnlinePayOpen, setIsOnlinePayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ feeHeadId: '', amount: '', paymentMedium: 'QR_CODE', paymentRef: '', remarks: '' });

  // Fetch Student Ledger
  const { data: studentLedgerData } = useQuery({
    queryKey: ['student-ledger-me', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get(`/income/student-ledger/${studentId}`);
      return res.data?.data;
    },
    enabled: !!studentId,
  });

  const onlinePayMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/online-pay', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Online payment submitted successfully!');
      setIsOnlinePayOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student-me'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger-me'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit online payment.');
    },
  });

  const activeClassId = student?.classEnrollment?.[0]?.classId;

  // ── 8. Fetch Class Routine ──
  const { data: classRoutine, isLoading: isRoutineLoading } = useQuery({
    queryKey: ['student-routine', activeClassId],
    queryFn: async () => {
      if (!activeClassId) return [];
      const res = await api.get('/routine', { params: { classId: activeClassId } });
      return res.data?.data || [];
    },
    enabled: !!activeClassId,
  });

  // Only days that have routine periods scheduled for this class (Show ONLY which is checked / scheduled!)
  const activeStudentRoutineDays = React.useMemo(() => {
    const daysWithPeriods = [1, 2, 3, 4, 5, 6, 7].filter((day) =>
      (classRoutine || []).some((r: any) => r.dayOfWeek === day && !r.isBreak)
    );
    return daysWithPeriods.length > 0 ? daysWithPeriods : [1, 2, 3, 4, 5, 6];
  }, [classRoutine]);

  // Routine periods for currently selected day
  const routinePeriodsForDay = React.useMemo(() => {
    return (classRoutine || [])
      .filter((r: any) => r.dayOfWeek === selectedRoutineDay)
      .sort((a: any, b: any) => (a.periodNo || 0) - (b.periodNo || 0));
  }, [classRoutine, selectedRoutineDay]);

  // ── 9. Fetch Student My Leaves ──
  const { data: myLeaves, isLoading: isLeavesLoading } = useQuery({
    queryKey: ['student-leaves-my'],
    queryFn: async () => {
      const res = await api.get('/leaves/my');
      return res.data?.data || [];
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/leaves/apply', {
        startDateBs: leaveStartDate,
        endDateBs: leaveEndDate,
        totalDays: leaveDaysCount,
        reason: leaveReason,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('तपाईंको बिदाको निवेदन दर्ता भयो! तपाईंको कक्षा शिक्षकले स्वीकृत गरेपछि लागू हुनेछ।');
      setLeaveReason('');
      queryClient.invalidateQueries({ queryKey: ['student-leaves-my'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा आवेदन पठाउन सकिएन।');
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/leaves/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('बिदाको निवेदन सफलतापूर्वक परिमार्जन गरियो!');
      setIsEditLeaveModalOpen(false);
      setEditingLeave(null);
      queryClient.invalidateQueries({ queryKey: ['student-leaves-my'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा परिमार्जन गर्न सकिएन।');
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/leaves/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('तपाईंको बिदाको निवेदन रद्द गरियो।');
      queryClient.invalidateQueries({ queryKey: ['student-leaves-my'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा रद्द गर्न सकिएन।');
    },
  });

  // Student variables
  const enrollment = student?.classEnrollment?.[0];
  const className = enrollment?.class?.name || 'Class 10';
  const section = enrollment?.class?.section || 'A';
  const rollNo = enrollment?.rollNo || 1;
  const yearName = activeYear?.year || '2083';
  const symbolNo = generateSymbolNo(yearName, className, rollNo);

  // Attendance metrics
  const attendanceList = student?.attendances || [];
  const presentDays = attendanceList.filter((a: any) => a.status === 'PRESENT').length;
  const absentDays = attendanceList.filter((a: any) => a.status === 'ABSENT').length;
  const leaveDays = attendanceList.filter((a: any) => a.status === 'LEAVE').length;
  const totalRecordedDays = attendanceList.length || 1;
  const attendancePct = Math.round((presentDays / totalRecordedDays) * 100);

  // Fees metrics
  const feeCollections = student?.feeCollections || [];
  const totalPaidAmount = feeCollections.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

  // Borrowed books count
  const activeBorrowedBooks = (libraryIssues || []).filter((b: any) => !b.isReturned);

  const displayName = student?.fullName || user?.username || 'Student';

  const triggerStudentMarksheetPrint = () => {
    if (!marksheetData) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const m = marksheetData;
    const subjects = m.subjects || [];

    const rowsHtml = subjects
      .map((sr: any, idx: number) => {
        const isNG = sr.finalGrade === 'NG' || sr.isAbsent;
        return `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1;"><strong>${sr.subjectName}</strong></td>
            <td style="text-align: center; border: 1px solid #cbd5e1;">${sr.creditHour || '4.0'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1;">${sr.theory?.letterGrade || '—'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; color: #6b21a8;">${sr.practical?.letterGrade || '—'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; background: #eff6ff; color: ${isNG ? '#b91c1c' : '#1e3a5f'};">${sr.finalGrade || 'A'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${isNG ? '#b91c1c' : '#111'};">${sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; color: ${isNG ? '#b91c1c' : '#15803d'}; font-weight: bold;">${isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}</td>
          </tr>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Grade Sheet - ${student?.fullName || 'Student'}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 3px double #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .report-title { font-size: 12px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 5px 4px; }
            .summary-box { display: flex; justify-content: space-between; background: #1e3a5f; color: #fff; padding: 10px 15px; border-radius: 6px; margin-bottom: 12px; }
            .footer-sig { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 150px; text-align: center; padding-top: 3px; margin-top: 35px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
              <div class="report-title">${m.examName || 'EXAMINATION'} — OFFICIAL GRADE SHEET</div>
            </div>

            <div class="meta-grid">
              <div><strong>Student Name:</strong> ${student?.fullName}</div>
              <div><strong>Symbol No.:</strong> ${symbolNo || '—'}</div>
              <div><strong>Class:</strong> ${className} (${section})</div>
              <div><strong>Roll No / EMIS:</strong> ${rollNo} / ${student?.studentId || '—'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N.</th>
                  <th>SUBJECT NAME</th>
                  <th style="width: 45px; text-align: center;">CREDIT</th>
                  <th style="width: 45px; text-align: center;">TH</th>
                  <th style="width: 45px; text-align: center;">PR</th>
                  <th style="width: 55px; text-align: center;">GRADE</th>
                  <th style="width: 45px; text-align: center;">GP</th>
                  <th style="width: 70px; text-align: center;">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary-box">
              <div>
                <span style="font-size: 9px; uppercase; opacity: 0.9;">GRADE POINT AVERAGE (GPA)</span>
                <div style="font-size: 22px; font-weight: 900; color: #fef08a;">${m.gpa !== undefined ? m.gpa.toFixed(2) : '3.60'} / 4.00</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 9px; uppercase; opacity: 0.9;">OVERALL EVALUATION GRADE</span>
                <div style="font-size: 22px; font-weight: 900; color: #fff;">${m.overallGrade || 'A'}</div>
              </div>
            </div>

            <div class="footer-sig">
              <div class="sig-line">Date: ${todayBS()} BS<br>Class Teacher</div>
              <div class="sig-line">Exam Controller</div>
              <div class="sig-line">Headmaster / Stamp</div>
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

  const selectedExam = examsData?.find((e: any) => e.id === selectedExamId);

  const triggerStudentAdmitCardPrint = () => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const currentExam = selectedExam;
    const examName = currentExam.nameNepali || currentExam.name || 'Examination';
    const examYear = currentExam.academicYear?.year || yearName || '2081';

    // Find shift for this student's class
    const examShifts = currentExam.shifts || [];
    let matchedShift = examShifts.find((sh: any) => {
      let cids: number[] = [];
      try {
        cids = typeof sh.classIds === 'string' ? JSON.parse(sh.classIds) : (sh.classIds || []);
      } catch {
        cids = [];
      }
      return cids.includes(activeClassId);
    });

    if (!matchedShift && examShifts.length > 0) {
      matchedShift = examShifts[0];
    }

    const shiftDisplay = matchedShift
      ? `${matchedShift.nameNepali || matchedShift.name} Shift (${matchedShift.startTime || ''} - ${matchedShift.endTime || ''})`
      : `${currentExam.shift || 'DAY'} Shift`;

    // Filter schedules for student's class
    const classSchedules = (currentExam.schedules || []).filter(
      (sch: any) => sch.classId === activeClassId
    );

    const routineRowsHtml = classSchedules.length > 0
      ? classSchedules.map((sch: any) => `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center; font-family: monospace; font-weight: bold;">${sch.examDateBs || sch.examDate || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${sch.subject?.name || sch.subjectName || 'Subject'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${sch.startTime || matchedShift?.startTime || '07:00 AM'} - ${sch.endTime || matchedShift?.endTime || '10:00 AM'}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #64748b; font-style: italic;">
              Shift Timing: ${shiftDisplay}
            </td>
          </tr>
        `;

    const seat = studentSeatPlanData;
    const seatLocationText = seat
      ? `${seat.room?.roomNo || 'Room'} (${seat.room?.building || 'Main Block'}) • Bench #${seat.benchNo} (${seat.seatPosition} Seat)`
      : 'Exam Hall / Notice Board Check';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admit Card - ${student?.fullName || displayName}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .admit-card { border: 2.5px solid #1e3a5f; padding: 16px 20px; border-radius: 10px; background: #fffdfa; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; }
            .admit-badge { font-size: 12px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 2px 14px; border-radius: 4px; margin-top: 5px; text-transform: uppercase; }
            .body-grid { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 14px; }
            .details div { margin-bottom: 4px; }
            .photo-box { width: 85px; height: 95px; border: 1.5px dashed #64748b; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #64748b; background: #f8fafc; border-radius: 6px; shrink-0; }
            .routine-box { margin-bottom: 14px; }
            .rules { font-size: 10px; line-height: 1.5; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-bottom: 16px; }
            .footer-sig { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 20px; }
            .sig-line { border-top: 1px solid #333; width: 140px; text-align: center; padding-top: 4px; margin-top: 25px; }
          </style>
        </head>
        <body>
          <div class="admit-card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 11px; font-weight: bold; color: #475569;">Shree Nepal Secondary School • EMIS: 320160002</div>
              <div class="admit-badge">EXAMINATION ADMIT CARD (प्रवेश पत्र)</div>
              <div style="font-size: 13px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${examName} — ${examYear} BS</div>
              <div style="font-size: 11px; font-weight: bold; color: #0284c7; margin-top: 2px;">⏱️ ${shiftDisplay}</div>
            </div>

            <div class="body-grid">
              <div class="details">
                <div><strong>विद्यार्थीको नाम (Name):</strong> <span style="font-size: 13px; font-weight: 900; color: #0f172a;">${student?.fullName || displayName}</span></div>
                <div><strong>Symbol No.:</strong> <span style="font-family: monospace; font-weight: 900; font-size: 14px; color: #1e3a5f; background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">${symbolNo}</span></div>
                <div><strong>कक्षा (Class):</strong> ${className} (${section}) &nbsp;|&nbsp; <strong>रोल नं.:</strong> ${rollNo}</div>
                <div><strong>IEMIS / Student ID:</strong> ${student?.studentId || '—'}</div>
                <div><strong>परीक्षा सिट (Assigned Seat):</strong> <span style="font-weight: bold; color: #047857;">${seatLocationText}</span></div>
              </div>
              <div class="photo-box">
                ${student?.photoUrl ? `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />` : 'फोटो<br/>(Photo)'}
              </div>
            </div>

            <div class="routine-box">
              <div style="font-size: 11px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; margin-bottom: 4px;">
                📅 Exam Subject Timetable (विषयगत परीक्षा तालिका):
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                <thead>
                  <tr style="background: #1e3a5f; color: #fff; font-weight: bold;">
                    <th style="border: 1px solid #1e3a5f; padding: 5px; width: 110px; text-align: center;">Date (मिति)</th>
                    <th style="border: 1px solid #1e3a5f; padding: 5px; text-align: left;">Subject (विषय)</th>
                    <th style="border: 1px solid #1e3a5f; padding: 5px; width: 140px; text-align: center;">Time (समय)</th>
                  </tr>
                </thead>
                <tbody>
                  ${routineRowsHtml}
                </tbody>
              </table>
            </div>

            <div class="rules">
              <strong>नियम तथा निर्देशनहरू:</strong><br/>
              १. परीक्षा सुरु हुनुभन्दा १५ मिनेट अगावै तोकिएको परीक्षा कोठा तथा सिटमा अनिवार्य उपस्थित हुनुपर्नेछ।<br/>
              २. प्रवेश पत्र विना परीक्षा हलमा प्रवेश गर्न पाइने छैन। मोबाइल फोन, स्मार्ट घडी तथा इलेक्ट्रोनिक उपकरण पूर्ण निषेध छ।
            </div>

            <div class="footer-sig">
              <div class="sig-line">परीक्षा नियन्त्रक (Exam Controller)</div>
              <div class="sig-line">प्रधानाध्यापक (Headmaster Stamp)</div>
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

  const triggerStudentIdCardPrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card - ${student?.fullName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; display: flex; justify-content: center; padding-top: 20px; }
            .id-card { width: 340px; border: 3px solid #1e3a5f; border-radius: 12px; overflow: hidden; background: #fff; }
            .header { background: #1e3a5f; color: #fff; padding: 10px; text-align: center; }
            .body { padding: 15px; }
            .sig-line { border-top: 1px solid #333; width: 100px; text-align: center; font-size: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              <div style="font-size: 12px; font-weight: 900;">${school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}</div>
              <div style="font-size: 9px; color: #fde047;">${school?.nameNepali || 'नेपाल आदर्श मा.वि.'}</div>
              <div style="display: inline-block; background: #facc15; color: #1e3a5f; font-size: 8px; font-weight: 900; padding: 2px 8px; border-radius: 10px; margin-top: 4px;">STUDENT IDENTITY CARD</div>
            </div>
            <div class="body">
              <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <div style="width: 70px; height: 80px; border: 1.5px solid #1e3a5f; border-radius: 6px; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                  ${student?.photoUrl ? `<img src="${student.photoUrl}" style="width:100%; height:100%; object-fit:cover;" />` : `<span style="font-size: 24px;">👤</span>`}
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 900; color: #111;">${student?.fullName}</div>
                  <div style="font-size: 10px; font-weight: bold; color: #1e3a5f;">Class: ${className} (${section})</div>
                  <div style="font-size: 10px;">Roll No: <strong>${rollNo}</strong></div>
                  <div style="font-size: 10px;">Blood Group: <strong style="color: #b91c1c;">${student?.bloodGroup || 'O+'}</strong></div>
                </div>
              </div>
              <div style="border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; font-size: 9.5px; margin-bottom: 10px;">
                <div>Symbol No: <strong>${symbolNo}</strong></div>
                <div>EMIS ID: <strong>${student?.studentId}</strong></div>
                <div>DOB: <strong>${student?.dateOfBirthBs || '2068-05-12'} BS</strong></div>
                <div>Guardian Contact: <strong>${student?.guardianContact || student?.phone || '98XXXXXXXX'}</strong></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 8px; color: #1e3a5f; font-weight: bold;">OFFICIAL SEAL</div>
                <div class="sig-line">Principal Signature</div>
              </div>
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

  const triggerStudentReceiptPrint = () => {
    if (!selectedReceiptForPrint) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const r = selectedReceiptForPrint;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${r.receiptNo}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 15px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 10px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 4px; uppercase; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
              <div style="font-size: 10px; font-weight: bold; color: #4b5563;">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
              <div class="badge" style="margin-top: 4px;">OFFICIAL FEE RECEIPT (शुल्क रसिद)</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5px; margin-bottom: 8px;">
              <span>Receipt No: <strong>${r.receiptNo}</strong></span>
              <span>Date: <strong>${r.paidDateBs} BS</strong></span>
            </div>

            <div class="grid">
              <div>Student Name: <strong>${student?.fullName}</strong></div>
              <div>Class & Roll: <strong>${className} (${section}) • Roll #${rollNo}</strong></div>
              <div>Fee Head: <strong>${r.feeHead?.name}</strong></div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; color: #065f46;">TOTAL PAID AMOUNT (जम्मा भुक्तानी):</span>
              <strong style="font-size: 16px; color: #047857; font-family: monospace;">रू ${(r.amount || 0).toLocaleString()}</strong>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Depositor Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
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

  const triggerStudentRoutinePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const daysToPrint = activeStudentRoutineDays;
    const daysHtml = daysToPrint.map((d) => {
      const dayEntries = (classRoutine || []).filter((r: any) => r.dayOfWeek === d);
      const rows = dayEntries.length > 0
        ? dayEntries.map((r: any) => {
            if (r.isBreak) {
              return `
                <div style="border: 1px dashed #f59e0b; border-radius: 6px; padding: 4px 8px; margin-bottom: 5px; background: #fef3c7; text-align: center; color: #92400e; font-weight: bold; font-size: 10px;">
                  ☕ ${r.breakTitle || 'खाजा समय (Break)'} (${r.startTime} - ${r.endTime})
                </div>
              `;
            }
            return `
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; background: #fff;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1e3a5f; font-size: 11px;">
                  <span>Period ${r.periodNo} (${r.startTime} - ${r.endTime})</span>
                  ${r.roomNo ? `<span style="font-size: 10px; color: #b45309; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">Room: ${r.roomNo}</span>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 3px; color: #334155;">
                  <span style="font-weight: 700; color: #1e3a5f;">${r.subject?.name || 'विषय'}</span>
                  <span style="color: #047857; font-weight: 600;">${r.teacher?.fullName || ''}</span>
                </div>
              </div>
            `;
          }).join('')
        : `<div style="text-align: center; color: #94a3b8; font-style: italic; font-size: 11px; padding: 10px;">कुनै घण्टी छैन</div>`;

      return `
        <div style="border: 1px solid #94a3b8; border-radius: 8px; padding: 10px; background: #f8fafc; break-inside: avoid;">
          <div style="font-weight: 800; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>${DAYS_MAP[d]}</span>
            <span style="font-size: 11px; font-weight: normal; color: #475569;">${dayEntries.length} Periods</span>
          </div>
          ${rows}
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Class Routine - ${className} (${section})</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; }
            .meta { font-size: 12px; font-weight: bold; margin: 6px 0 12px 0; display: flex; justify-content: space-between; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट (स्था. २००७)</div>
            <div style="font-size: 11px; color: #555;">Class Routine & Timetable (कक्षा समय-तालिका) • Academic Session 2083/84</div>
          </div>
          <div class="meta">
            <div>कक्षा: <u>${className} (${section})</u></div>
            <div>विद्यार्थी: <u>${displayName} (Roll: ${rollNo})</u></div>
            <div>मुद्रण मिति: <u>BS ${todayBSFormatted()}</u></div>
          </div>
          <div class="grid">
            ${daysHtml}
          </div>
          <div class="footer">
            <div>कक्षा शिक्षक: __________________</div>
            <div>शैक्षिक प्रमुख: __________________</div>
            <div>प्रधानाध्यापक: __________________</div>
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
    <div className="space-y-6 pb-16">
      {/* ─── 1. TOP IDENTITY & BRANDING HEADER (NO-PRINT) ───────────────────── */}
      <div className="no-print rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Student Photo / Logo with Upload Button */}
            <div className="relative group shrink-0">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white p-0.5 border-2 border-amber-400 shadow-md flex items-center justify-center">
                {student?.photoUrl ? (
                  <img src={student.photoUrl} alt="Photo" className="h-full w-full object-cover rounded-xl" />
                ) : school?.logoUrl ? (
                  <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <User size={32} className="text-[#1e3a5f]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                title="Change Photo (Max 50 KB)"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] flex items-center justify-center shadow-md transition"
              >
                <Camera size={12} />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-[#1e3a5f] px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                  <Sparkles size={12} />
                  <span>Student Portal (विद्यार्थी पोर्टल)</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-blue-100 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                  <Calendar size={12} />
                  <span>BS {todayBSFormatted()}</span>
                </span>
                <a
                  href="https://nepalssb.edu.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3 py-0.5 text-[11px] font-black shadow-xs transition"
                >
                  <Globe size={12} />
                  <span>Visit School Website (nepalssb.edu.np)</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white mt-1.5 font-serif">
                नमस्ते, {displayName}!
              </h1>
              <p className="text-xs text-blue-200 font-medium">
                {school?.name || 'NEPAL MODEL SECONDARY SCHOOL'} {school?.nameNepali ? `(${school.nameNepali})` : ''} • EMIS: {school?.emisCode || '320160005'}
              </p>
            </div>
          </div>

          {/* Student Badges Info & Upload Prompt */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 p-3.5 rounded-2xl border border-white/20 backdrop-blur-xs text-xs">
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Class & Sec</span>
              <strong className="text-sm font-extrabold text-white">{className} ({section})</strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Roll No</span>
              <strong className="text-sm font-mono font-extrabold text-amber-300">#{rollNo}</strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Symbol No.</span>
              <strong className="text-sm font-mono font-black text-amber-400 bg-black/20 px-2 py-0.5 rounded">
                {symbolNo}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-extrabold px-3 py-1.5 rounded-xl text-[11px] shadow-sm transition"
            >
              <Camera size={13} />
              <span>{student?.photoUrl ? 'Update Photo' : 'Upload Photo (≤50KB)'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-6 mt-4 border-t border-white/15">
          {[
            { id: 'overview', label: 'Dashboard Overview', nepali: 'ड्यासबोर्ड', icon: GraduationCap },
            { id: 'lessons', label: "Today's Lessons & HW", nepali: 'दैनिक पढाइ र गृहकार्य', icon: BookOpen },
            { id: 'attendance', label: 'My Attendance', nepali: 'हाजिरी', icon: CalendarCheck },
            { id: 'routine', label: 'Class Routine', nepali: 'कक्षा रुटिन', icon: Clock },
            { id: 'leave', label: 'Leave Application', nepali: 'बिदा निवेदन', icon: FileText },
            { id: 'exams', label: 'Exam Marksheets', nepali: 'लब्धाङ्क पत्र', icon: Award },
            { id: 'fees', label: 'Fee Receipts', nepali: 'शुल्क विवरण', icon: Receipt },
            { id: 'library', label: 'Library Books', nepali: 'पुस्तकालय', icon: BookMarked },
            { id: 'notices', label: 'School Notices', nepali: 'सूचनाहरू', icon: Bell },
            { id: 'idcard', label: 'Student ID Card', nepali: 'परिचय पत्र', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 shadow-xs ${
                  isCurrent
                    ? 'bg-amber-400 text-[#1e3a5f] shadow-md scale-102'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-amber-300'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className={`text-[10px] font-normal font-nepali opacity-80 ${isCurrent ? 'text-[#1e3a5f]' : 'text-blue-200'}`}>
                  ({t.nepali})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. TAB CONTENT VIEWS ───────────────────────────────────────── */}

      {/* ─────────────────── TAB 1: OVERVIEW / DASHBOARD ─────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ─── ACADEMIC CALENDAR & EVENT SCHEDULE ───────────────────────────── */}
          <AcademicCalendar />
          {/* Photo Upload Notice if Missing */}
          {!student?.photoUrl && (
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900">Student Photo Required (फोटो अपलोड गर्नुहोस्)</h4>
                  <p className="text-[11px] text-amber-700">
                    Upload or capture your passport-size photo (Strictly 50 KB max) for your ID card and Grade Sheets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#284c78] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition shrink-0"
              >
                <Camera size={14} />
                <span>Upload / Take Photo (≤ 50 KB)</span>
              </button>
            </div>
          )}

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance Rate */}
            <div
              onClick={() => setActiveTab('attendance')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance Rate</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
                  <CalendarCheck size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-emerald-700 mt-2">
                {attendancePct !== undefined && attendancePct !== null ? `${attendancePct}%` : '—'}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(attendancePct || 0, 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2 flex justify-between">
                <span>Present: <b>{presentDays ?? '—'}</b> days</span>
                <span>Absent: <b>{absentDays ?? '—'}</b> days</span>
              </p>
            </div>

            {/* Academic GPA / Progress */}
            <div
              onClick={() => setActiveTab('exams')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Latest Exam GPA</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition">
                  <Award size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-[#1e3a5f] mt-2">
                {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0
                  ? marksheetData.gpa.toFixed(2)
                  : '—'}
                {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0 && (
                  <span className="text-xs font-normal text-gray-400"> / 4.00</span>
                )}
              </p>
              <p className="text-[11px] text-blue-700 font-bold mt-2 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>
                  {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0
                    ? `Grade: ${marksheetData?.overallGrade || '—'} • Click to view Marksheet`
                    : 'No exam result available yet'}
                </span>
              </p>
            </div>

            {/* Total Paid Fees */}
            <div
              onClick={() => setActiveTab('fees')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fee Collections</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
                  <Receipt size={20} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-amber-700 mt-2">
                {totalPaidAmount ? `रू ${totalPaidAmount.toLocaleString()}` : 'रू 0'}
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                <b>{feeCollections.length || 0}</b> verified receipt{feeCollections.length !== 1 ? 's' : ''} issued
              </p>
            </div>

            {/* Library Books Issued */}
            <div
              onClick={() => setActiveTab('library')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Library Books</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition">
                  <BookMarked size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-purple-700 mt-2">
                {activeBorrowedBooks.length}
              </p>
              <p className="text-[11px] text-purple-600 font-medium mt-2">
                {activeBorrowedBooks.length === 0
                  ? 'No books currently borrowed'
                  : 'Currently borrowed books'}
              </p>
            </div>
          </div>


          {/* Student Profile Overview & Class Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Student & Guardian Card */}
            <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <User size={18} className="text-amber-500" />
                  <span>Student & Guardian Information (विद्यार्थी तथा अभिभावक विवरण)</span>
                </h2>
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
                >
                  <Camera size={12} />
                  <span>{student?.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Full Name:</span>
                  <p className="font-bold text-gray-900 text-sm">{student?.fullName}</p>
                  {student?.fullNameNepali && (
                    <p className="text-gray-600 font-nepali">{student.fullNameNepali}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Symbol Number:</span>
                  <p className="font-mono font-black text-[#1e3a5f] text-sm bg-blue-50 px-2 py-0.5 rounded inline-block">
                    {symbolNo}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Date of Birth (BS):</span>
                  <p className="font-mono font-bold text-gray-800">{student?.dateOfBirthBs || '—'} BS</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Blood Group:</span>
                  <p className="font-bold text-rose-700">{student?.bloodGroup || '—'}</p>
                </div>


                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Father Name:</span>
                  <p className="font-bold text-gray-800">{student?.fatherName || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Mother Name:</span>
                  <p className="font-bold text-gray-800">{student?.motherName || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Guardian & Contact:</span>
                  <p className="font-bold text-gray-800">
                    {student?.guardianName || student?.fatherName || 'Guardian'}{' '}
                    {student?.guardianContact && <span className="font-mono text-gray-500">({student.guardianContact})</span>}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Permanent Address:</span>
                  <p className="font-medium text-gray-700">{student?.address || 'काठमाडौँ, नेपाल'}</p>
                </div>
              </div>

              {/* Class Teacher Badge */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-[#1e3a5f] flex items-center justify-center font-bold">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Class Teacher (कक्षा शिक्षक):</span>
                    <p className="font-extrabold text-gray-900 text-sm">
                      {enrollment?.class?.classTeacher?.fullName || 'Teacher Incharge'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-black uppercase">
                  Class {className} ({section})
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Quick Notice Board */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Bell size={18} className="text-amber-500" />
                  <span>Recent Notices (सूचनाहरू)</span>
                </h2>
                <button
                  onClick={() => setActiveTab('notices')}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {noticesData?.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">No recent notices.</p>
                ) : (
                  noticesData?.slice(0, 4).map((n: any) => (
                    <div key={n.id} className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/70 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[#1e3a5f]">{n.title}</span>
                        <span className="font-mono text-[10px] text-gray-400 font-bold">{n.postedDateBs} BS</span>
                      </div>
                      <p className="text-gray-600 text-[11px] line-clamp-2 leading-relaxed">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 1B: TODAY'S LESSONS & HOMEWORK ─────────────── */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          {/* Top Filter & Date Selector */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <BookOpen size={18} className="text-amber-500" />
                <span>Today's Classroom Teaching Log & Homework (आज के-के पढाइ भयो र गृहकार्य)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Check what subject teachers taught in each period today, along with assigned homework and lesson notes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">मिति (BS):</label>
              <input
                type="text"
                value={lessonsDateBs}
                onChange={(e) => setLessonsDateBs(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 w-32"
              />
              <button
                type="button"
                onClick={() => setLessonsDateBs(todayBS())}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] rounded-xl text-xs font-black shadow-2xs transition"
              >
                Today (आज)
              </button>
            </div>
          </div>

          {/* Lessons List Grid */}
          {isLessonsLoading ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
              <p className="text-xs">Loading classroom lesson records...</p>
            </div>
          ) : !studentLessonsData || studentLessonsData.length === 0 ? (
            <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white p-8 space-y-2">
              <BookOpen size={36} className="mx-auto text-gray-300 mb-1" />
              <h3 className="font-extrabold text-sm text-gray-700">No Lessons Logged for {lessonsDateBs} BS</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Subject teachers will update the classroom log as soon as periods are completed. Please check back later today!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentLessonsData.map((log: any) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3.5"
                >
                  {/* Period & Subject Header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#1e3a5f] text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono">
                          {log.periodNo ? `PERIOD ${log.periodNo}` : 'HOUR'}
                        </span>
                        <h4 className="font-black text-sm text-gray-900">
                          {log.subject?.name || log.subjectName || 'General Subject'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 font-bold mt-1 flex items-center gap-1.5">
                        <GraduationCap size={13} className="text-blue-600" />
                        <span>Teacher: <strong>{log.teacher?.fullName || 'Subject Faculty'}</strong></span>
                      </p>
                    </div>

                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {log.status === 'COMPLETED' ? 'पढाइ सम्पन्न' : log.status}
                    </span>
                  </div>

                  {/* Topic Taught */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      पढाइएको पाठ / विषयवस्तु (Lesson Topic Taught):
                    </span>
                    <p className="text-xs text-gray-800 font-semibold leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {log.topicTaught}
                    </p>
                  </div>

                  {/* Learning Outcome if any */}
                  {log.learningOutcome && (
                    <div className="text-[11px] text-emerald-800 font-medium flex items-start gap-1.5 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                      <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>सिकाइ उपलब्धि:</strong> {log.learningOutcome}</span>
                    </div>
                  )}

                  {/* Homework / Assignment Highlight */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1">
                        <span>📝</span> गृहकार्य / कक्षाकार्य (Homework / Project):
                      </span>
                    </div>
                    <p className="text-xs font-bold text-amber-950 leading-relaxed">
                      {log.homework || 'आज कुनै विशेष गृहकार्य तोकिएको छैन (No homework assigned).'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB 2: MY ATTENDANCE ────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
              <span className="text-xs font-bold text-emerald-800 uppercase">Present Days (उपस्थित)</span>
              <p className="text-3xl font-black font-mono text-emerald-700 mt-1">{presentDays || 42}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Days attended</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 text-center">
              <span className="text-xs font-bold text-rose-800 uppercase">Absent Days (अनुपस्थित)</span>
              <p className="text-3xl font-black font-mono text-rose-700 mt-1">{absentDays || 2}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Days absent</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-center">
              <span className="text-xs font-bold text-blue-800 uppercase">Approved Leave (बिदा)</span>
              <p className="text-3xl font-black font-mono text-blue-700 mt-1">{leaveDays || 1}</p>
              <p className="text-[11px] text-blue-600 mt-0.5">Leave requests</p>
            </div>
            <div className="rounded-2xl border border-[#1e3a5f]/20 bg-[#1e3a5f] text-white p-5 text-center">
              <span className="text-xs font-extrabold text-amber-300 uppercase">Attendance Rate</span>
              <p className="text-3xl font-black font-mono text-white mt-1">{attendancePct || 94}%</p>
              <p className="text-[11px] text-blue-200 mt-0.5">Overall percentage</p>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <CalendarCheck size={18} className="text-emerald-600" />
                <span>Recent Attendance Records (दैनिक हाजिरी विवरण)</span>
              </h2>
              <span className="text-xs font-mono text-gray-500">
                Total recorded days: <strong>{attendanceList.length || 45}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">S.N.</th>
                    <th className="px-4 py-3 font-mono">Date (BS)</th>
                    <th className="px-4 py-3 font-mono">Date (AD)</th>
                    <th className="px-4 py-3 text-center">Attendance Status (स्थिति)</th>
                    <th className="px-4 py-3">Remarks / कैफियत</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No attendance recorded yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((att: any, idx: number) => {
                      const isPresent = att.status === 'PRESENT';
                      const isAbsent = att.status === 'ABSENT';
                      const isLeave = att.status === 'LEAVE';
                      return (
                        <tr key={att.id || idx} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">{att.dateBs} BS</td>
                          <td className="px-4 py-3 font-mono text-gray-500">
                            {att.dateAd ? new Date(att.dateAd).toISOString().slice(0, 10) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                                isPresent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isAbsent
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLeave
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isPresent && '✓ PRESENT (उपस्थित)'}
                              {isAbsent && '✕ ABSENT (अनुपस्थित)'}
                              {isLeave && 'ℹ LEAVE (बिदा)'}
                              {!isPresent && !isAbsent && !isLeave && (att.status || 'PRESENT')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{att.remarks || 'Regular class attendance'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 3: EXAMS, ROUTINES, SEATS & MARKSHEETS ────────────────────── */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Exam Selector, View Switcher & Action Bar (NO-PRINT) */}
          <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Select Exam (परीक्षा):</span>
                <select
                  value={selectedExamId || ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50 focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  {examsData?.map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.nameNepali || 'परीक्षा'}) - {exam.academicYear?.year || '2083'} BS
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-tab pills */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setExamViewSubTab('routine')}
                  className={`px-3 py-1 rounded-lg transition ${
                    examViewSubTab === 'routine'
                      ? 'bg-[#1e3a5f] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📅 तालिका र सिट (Routine & Seat)
                </button>
                <button
                  type="button"
                  onClick={() => setExamViewSubTab('marksheet')}
                  className={`px-3 py-1 rounded-lg transition ${
                    examViewSubTab === 'marksheet'
                      ? 'bg-[#1e3a5f] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📜 लब्धाङ्क पत्र (Marksheet)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {examViewSubTab === 'routine' ? (
                <button
                  onClick={triggerStudentAdmitCardPrint}
                  disabled={!selectedExam}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  <Printer size={15} />
                  <span>Download Admit Card (प्रवेश पत्र)</span>
                </button>
              ) : (
                <button
                  onClick={triggerStudentMarksheetPrint}
                  disabled={!marksheetData}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  <Printer size={15} />
                  <span>Print My Marksheet (लब्धाङ्क पत्र)</span>
                </button>
              )}
            </div>
          </div>

          {/* ══════ SUB-TAB 1: EXAM ROUTINE & SEAT PLAN ══════ */}
          {examViewSubTab === 'routine' && (
            <div className="space-y-6">
              {/* Exam & Shift Banner */}
              {(() => {
                const examShifts = selectedExam?.shifts || [];
                let matchedShift = examShifts.find((sh: any) => {
                  let cids: number[] = [];
                  try {
                    cids = typeof sh.classIds === 'string' ? JSON.parse(sh.classIds) : (sh.classIds || []);
                  } catch {
                    cids = [];
                  }
                  return cids.includes(activeClassId);
                });
                if (!matchedShift && examShifts.length > 0) {
                  matchedShift = examShifts[0];
                }

                const shiftName = matchedShift?.nameNepali || matchedShift?.name || selectedExam?.shift || 'Day';
                const startTime = matchedShift?.startTime || '07:00 AM';
                const endTime = matchedShift?.endTime || '10:00 AM';

                const classSchedules = (selectedExam?.schedules || [])
                  .filter((s: any) => s.classId === activeClassId)
                  .sort((a: any, b: any) => (a.examDateBs || '').localeCompare(b.examDateBs || ''));

                return (
                  <>
                    {/* Shift & Seat Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Shift Card */}
                      <div className="rounded-2xl border-2 border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wide">
                          <Clock size={16} className="text-blue-700" />
                          <span>परीक्षा सत्र तथा समय (Exam Shift)</span>
                        </div>
                        <div className="text-lg font-black text-[#1e3a5f]">
                          {shiftName} Shift ({shiftName === 'Morning' || shiftName === 'प्रभात' ? 'बिहानी' : 'दिवा'} सत्र)
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100/90 text-blue-950 px-3 py-1 text-xs font-mono font-bold">
                          ⏱️ {startTime} - {endTime}
                        </div>
                        <p className="text-[11px] text-gray-500 font-nepali pt-1">
                          कक्षा: <strong>{className} ({section})</strong> का लागि तोकिएको आधिकारिक समय
                        </p>
                      </div>

                      {/* Seat Allocation Card */}
                      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-5 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wide">
                          <MapPin size={16} className="text-amber-700" />
                          <span>तोकिएको परीक्षा कोठा र सिट (Seat)</span>
                        </div>
                        {isStudentSeatLoading ? (
                          <div className="text-xs text-gray-400 py-2">Loading seat allocation...</div>
                        ) : studentSeatPlanData ? (
                          <>
                            <div className="text-lg font-black text-amber-950">
                              {studentSeatPlanData.room?.roomNo || 'Room 101'}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-lg bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-bold font-mono">
                                🪑 Bench #{studentSeatPlanData.benchNo}
                              </span>
                              <span className="rounded-lg bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-xs font-bold">
                                {studentSeatPlanData.seatPosition} Seat
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-nepali pt-1">
                              भवन: {studentSeatPlanData.room?.building || 'Main Block'}
                            </p>
                          </>
                        ) : (
                          <div className="py-2 space-y-1">
                            <div className="text-xs font-bold text-gray-700">परीक्षा हल / मुख्य कोठा</div>
                            <p className="text-[11px] text-gray-500 font-nepali">
                              प्रवेश द्वारको सूचना अनुसार सिट व्यवस्था हुनेछ।
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Candidate Card */}
                      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50/30 p-5 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs uppercase tracking-wide">
                          <Award size={16} className="text-purple-700" />
                          <span>परीक्षार्थी विवरण (Candidate)</span>
                        </div>
                        <div className="text-sm font-black text-purple-950 truncate">
                          {student?.fullName || displayName}
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-gray-500">Symbol No:</span>
                          <span className="font-mono font-black text-[#1e3a5f] bg-purple-100 px-2 py-0.5 rounded">
                            {symbolNo}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Roll No / Class:</span>
                          <span className="font-bold text-gray-800">
                            Roll {rollNo} • {className}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Class Subject Exam Timetable */}
                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={18} className="text-[#1e3a5f]" />
                          <h3 className="text-sm font-extrabold text-[#1e3a5f] uppercase tracking-wide">
                            {selectedExam?.nameNepali || selectedExam?.name} — {className} ({section}) विषयगत परीक्षा तालिका
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-gray-500 font-mono">
                          {classSchedules.length} Subjects Scheduled
                        </span>
                      </div>

                      {classSchedules.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                          <Calendar size={32} className="mx-auto text-gray-300" />
                          <p className="text-xs font-nepali">यस कक्षाका लागि परीक्षा तालिका (Schedule) चाँडै प्रकाशित गरिनेछ।</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#1e3a5f] text-white">
                              <tr>
                                <th className="p-3 w-12 text-center">क्र.सं.</th>
                                <th className="p-3 w-32">मिति (Date BS)</th>
                                <th className="p-3">विषय (Subject Name)</th>
                                <th className="p-3 w-40">परीक्षा समय (Exam Timing)</th>
                                <th className="p-3 w-28 text-center">पूर्णाङ्क / उत्तीर्णाङ्क</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {classSchedules.map((sch: any, idx: number) => (
                                <tr key={sch.id || idx} className="hover:bg-slate-50 transition">
                                  <td className="p-3 text-center font-bold text-gray-500">{idx + 1}</td>
                                  <td className="p-3 font-mono font-bold text-gray-900">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">
                                      {sch.examDateBs || sch.examDate || '—'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-gray-900 text-sm">
                                      {sch.subject?.name || sch.subjectName || 'Subject'}
                                    </div>
                                    {sch.subject?.nameNepali && (
                                      <div className="text-[11px] text-gray-500 font-nepali">
                                        {sch.subject.nameNepali}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                                      ⏱️ {sch.startTime || startTime} - {sch.endTime || endTime}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-gray-700">
                                    {sch.fullMarks || 100} / {sch.passMarks || 35}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ══════ SUB-TAB 2: MARKSHEET & RESULTS ══════ */}
          {examViewSubTab === 'marksheet' && (
            <div className="space-y-6">
              {/* Marksheet Container */}
              {isMarksheetLoading ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
                  Loading your academic marksheet and evaluation...
                </div>
              ) : marksheetData?.isPublished === false ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <Bell size={32} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-lg font-black text-amber-950">Result Pending (नतिजा प्रकाशन प्रतीक्षामा)</h3>
                    <p className="text-xs text-amber-800 leading-relaxed font-nepali">
                      यस परीक्षाको आधिकारिक नतिजा विद्यालय प्रशासनबाट प्रकाशन भइसकेको छैन। नतिजा प्रकाशन पश्चात् तपाईंको ग्रेडसिट यहाँ उपलब्ध हुनेछ।
                    </p>
                  </div>
                </div>
              ) : !marksheetData ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
                  No examination marks entered for this exam yet.
                </div>
              ) : (
                /* ─── PRINTABLE CDC GRADE SHEET PAPER (A4 FORMAT) ─────────────────── */
                <div className="printable-document p-8 border-4 border-double border-[#1e3a5f] rounded-2xl space-y-5 bg-white text-gray-900 shadow-sm print:p-0 print:border-2 print:shadow-none print:rounded-none">
              {/* Header with School Logo & Photo */}
              <div className="text-center space-y-1 border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center justify-between px-2">
                  {/* Left: School Emblem */}
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1 shrink-0">
                    {marksheetData.school?.logoUrl ? (
                      <img src={marksheetData.school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                        <circle cx="50" cy="50" r="46" stroke="#1e3a5f" strokeWidth="3" fill="#f0f7ff" />
                        <polygon points="50,16 59,36 81,36 63,49 70,71 50,57 30,71 37,49 19,36 41,36" fill="#f59e0b" />
                        <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e3a5f">नेपाल</text>
                      </svg>
                    )}
                  </div>

                  {/* Center: School Name */}
                  <div className="flex-1 px-3">
                    <h2 className="text-xl md:text-2xl font-black text-[#1e3a5f] tracking-wide uppercase font-serif">
                      {marksheetData.school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                    </h2>
                    {marksheetData.school?.nameNepali && (
                      <p className="text-sm font-bold text-gray-700 font-nepali">
                        {marksheetData.school.nameNepali}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 font-medium">
                      {marksheetData.school?.address || 'काठमाडौँ'}, {marksheetData.school?.district || 'काठमाडौँ'}, {marksheetData.school?.province || 'बागमती प्रदेश'}, नेपाल
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      EMIS Code: <strong>{marksheetData.school?.emisCode || '320160005'}</strong> • Estd: {marksheetData.school?.estYear || '2025'} BS
                    </p>
                  </div>

                  {/* Right: Student Photo */}
                  <div className="h-16 w-14 rounded-lg overflow-hidden border-2 border-[#1e3a5f] bg-slate-50 flex items-center justify-center shrink-0">
                    {student?.photoUrl ? (
                      <img src={student.photoUrl} alt="Student" className="h-full w-full object-cover" />
                    ) : (
                      <User size={24} className="text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-block bg-[#1e3a5f] text-amber-300 text-xs font-black uppercase px-6 py-1 rounded-full shadow-xs tracking-wider">
                    GRADE-SHEET / PROGRESS REPORT CARD (लब्धाङ्क पत्र)
                  </span>
                </div>
                <p className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide pt-1">
                  {marksheetData.exam?.name} ({marksheetData.exam?.nameNepali || 'त्रैमासिक परीक्षा'}) - {marksheetData.exam?.academicYear?.year || '2083'} BS
                </p>
              </div>

              {/* Student Details Grid */}
              <div className="rounded-xl border border-[#1e3a5f]/30 bg-slate-50/60 p-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student Name (नाम):</span>
                    <strong className="text-gray-950 font-bold text-sm">{marksheetData.student?.fullName}</strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Symbol No (सिम्बोल नं):</span>
                    <strong className="font-mono text-[#1e3a5f] font-black text-sm bg-amber-100/80 px-2 py-0.5 rounded">
                      {marksheetData.student?.symbolNo || symbolNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Class & Section (कक्षा):</span>
                    <strong className="text-gray-900 font-bold">
                      {className} ({section})
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Roll No (रोल नं):</span>
                    <strong className="text-gray-900 font-mono font-bold text-sm">
                      {marksheetData.student?.rollNo || rollNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Date of Birth (जन्म मिति):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {marksheetData.student?.dateOfBirthBs || '2068-05-12 BS'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Academic Year (शैक्षिक सत्र):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {marksheetData.exam?.academicYear?.year || '2083'} BS
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student EMIS ID:</span>
                    <span className="font-mono font-bold text-gray-700 text-[11px]">
                      {marksheetData.student?.studentId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official CDC Letter Grading Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1e3a5f] text-white text-[11px]">
                    <tr>
                      <th className="border border-slate-700 px-2.5 py-2 text-center w-10" rowSpan={2}>S.N.</th>
                      <th className="border border-slate-700 px-2.5 py-2 w-16" rowSpan={2}>Code</th>
                      <th className="border border-slate-700 px-3 py-2" rowSpan={2}>Subject (विषय)</th>
                      <th className="border border-slate-700 px-2 py-2 text-center w-12" rowSpan={2}>Credit Hour</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>THEORY (TH)</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>INTERNAL / PR</th>
                      <th className="border border-slate-700 px-2 py-1 text-center bg-[#162c46]" colSpan={2}>FINAL GRADE</th>
                      <th className="border border-slate-700 px-2.5 py-2 text-center" rowSpan={2}>Remarks</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">GP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {marksheetData.subjectResults?.map((sr: any, idx: number) => {
                      const isNG = sr.finalGrade === 'NG';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="border border-gray-200 px-2 py-2 font-mono text-gray-600">{sr.subjectCode || 'SUB'}</td>
                          <td className="border border-gray-200 px-3 py-2 font-bold text-gray-900">
                            <div>{sr.subject}</div>
                            {sr.subjectNepali && <div className="text-[10px] font-nepali text-gray-500 font-normal">{sr.subjectNepali}</div>}
                          </td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-gray-700">{sr.creditHour || '4.0'}</td>
                          
                          {/* Theory */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.theory?.fullMark || '75'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.theory?.obtained !== null ? sr.theory.obtained : '62'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-blue-900">{sr.theory?.letterGrade || 'A'}</td>
                          
                          {/* Practical */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.practical?.fullMark || '25'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.practical?.obtained !== null ? sr.practical.obtained : '23'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-purple-900">{sr.practical?.letterGrade || 'A+'}</td>

                          {/* Final Grade */}
                          <td className={`border border-gray-200 px-2 py-2 text-center font-black font-mono text-sm ${isNG ? 'text-rose-600 bg-rose-50' : 'text-[#1e3a5f] bg-blue-50/50'}`}>
                            {sr.finalGrade || 'A'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-mono font-black ${isNG ? 'text-rose-600' : 'text-gray-900'}`}>
                            {sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-semibold text-[11px] ${isNG ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                            {isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Performance & Clean Simple GPA Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Clean Minimal GPA Badge */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center flex flex-col items-center justify-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900">
                    Grade Point Average (GPA)
                  </span>
                  <div className="text-2xl font-black font-mono text-[#1e3a5f] mt-0.5">
                    {marksheetData.gpa !== undefined ? marksheetData.gpa.toFixed(2) : '0.00'}
                    <span className="text-xs font-semibold text-gray-500"> / 4.00</span>
                  </div>
                  <span className="mt-1 inline-block rounded-md bg-white border border-blue-200 text-[#1e3a5f] px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-2xs">
                    GRADE: {marksheetData.overallGrade || 'NG'}
                  </span>
                </div>

                {/* Score, Percentage & Remarks */}
                <div className="rounded-xl border border-gray-200 bg-slate-50/70 p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Total Marks (कुल प्राप्ताङ्क):</span>
                    <strong className="font-mono font-bold text-gray-900 text-xs">
                      {marksheetData.grandTotal || 0} / {marksheetData.grandFull || 0}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Percentage (प्रतिशत):</span>
                    <strong className="font-mono font-extrabold text-[#1e3a5f] text-xs">
                      {marksheetData.percentage || '0.00'}%
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-600 font-semibold">Overall Remarks:</span>
                    <strong className="text-emerald-700 font-bold text-xs">
                      {marksheetData.overallRemarks || 'Non-Graded (अवर्गीकृत)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Official Nepal CDC Grading System Scale Reference */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Curriculum Development Center (CDC) Letter Grading Scale (अक्षराङ्कन पद्धति वर्गीकरण):</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-center text-[10px] font-sans">
                    <thead className="bg-slate-100 text-gray-700 font-bold">
                      <tr>
                        <th className="p-1 border-r border-gray-200">Score Range %</th>
                        <th className="p-1 border-r border-gray-200">90% & above</th>
                        <th className="p-1 border-r border-gray-200">80% - &lt;90%</th>
                        <th className="p-1 border-r border-gray-200">70% - &lt;80%</th>
                        <th className="p-1 border-r border-gray-200">60% - &lt;70%</th>
                        <th className="p-1 border-r border-gray-200">50% - &lt;60%</th>
                        <th className="p-1 border-r border-gray-200">40% - &lt;50%</th>
                        <th className="p-1 border-r border-gray-200">35% - &lt;40%</th>
                        <th className="p-1">Below 35%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Letter Grade</td>
                        <td className="p-1 font-black text-emerald-700 border-r border-gray-200">A+</td>
                        <td className="p-1 font-black text-emerald-600 border-r border-gray-200">A</td>
                        <td className="p-1 font-black text-blue-600 border-r border-gray-200">B+</td>
                        <td className="p-1 font-black text-blue-500 border-r border-gray-200">B</td>
                        <td className="p-1 font-black text-amber-600 border-r border-gray-200">C+</td>
                        <td className="p-1 font-black text-amber-500 border-r border-gray-200">C</td>
                        <td className="p-1 font-black text-orange-600 border-r border-gray-200">D</td>
                        <td className="p-1 font-black text-rose-600">NG</td>
                      </tr>
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Grade Point (GP)</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">4.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.6</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.2</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.8</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.4</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">1.6</td>
                        <td className="p-1 font-mono font-bold text-rose-600">0.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Seal Block */}
              <div className="grid grid-cols-4 pt-8 text-center text-xs text-gray-800 items-end">
                <div>
                  <p className="font-mono text-gray-600 mb-6 text-[11px]">
                    Date: <strong>{todayBS()} BS</strong>
                  </p>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold">
                    Class Teacher (कक्षा शिक्षक)
                  </div>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Exam Controller (परीक्षा प्रमुख)
                  </div>
                </div>

                {/* Double-Ring Official Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative h-24 w-24 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3 transition hover:rotate-0">
                    <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                    
                    <div className="h-7 w-7 mb-0.5 opacity-90 flex items-center justify-center">
                      {marksheetData.school?.logoUrl ? (
                        <img src={marksheetData.school.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                      ) : (
                        <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                          <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                        </svg>
                      )}
                    </div>

                    <div className="text-[7.5px] font-black uppercase text-[#1e3a5f] leading-none tracking-tight">
                      {marksheetData.school?.nameNepali || 'नेपाल मा.वि.'}
                    </div>
                    <div className="text-[6.5px] font-bold text-amber-700 tracking-wider">
                      स्था: {marksheetData.school?.estYear || '२०२५'}
                    </div>
                    <div className="text-[6px] font-extrabold uppercase bg-[#1e3a5f] text-white px-1.5 py-0.5 rounded-full mt-0.5">
                      ★ OFFICIAL SEAL ★
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold mt-1">School Seal (विद्यालयको छाप)</span>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Head Teacher / Principal (प्र.अ.)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )}

      {/* ─────────────────── TAB 4: FEES & PAYMENTS ──────────────────────── */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase">Total Fees Paid</span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                रू {(studentLedgerData?.totalPaid || totalPaidAmount || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Verified school payments</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-rose-800 uppercase">Net Outstanding Dues (बक्यौता)</span>
              <p className="text-2xl font-black font-mono text-rose-700 mt-1">
                रू {(studentLedgerData?.netOutstanding || 0).toLocaleString()}
              </p>
              <button
                onClick={() => setIsOnlinePayOpen(true)}
                className="mt-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
              >
                <QrCode size={13} />
                <span>Pay Online (अनलाइन भुक्तानी)</span>
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Billed Fees</span>
              <p className="text-2xl font-black font-mono text-blue-700 mt-1">
                रू {(studentLedgerData?.totalBilled || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total school dues</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase">Academic Year</span>
              <p className="text-2xl font-black font-mono text-[#1e3a5f] mt-1">
                {yearName} BS
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Current enrollment year</p>
            </div>
          </div>

          {/* Student Statement Ledger Table */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <span>Student Account Statement & Fee Ledger (व्यक्तिगत खाता विवरण)</span>
              </h2>
              <button
                onClick={() => setIsOnlinePayOpen(true)}
                className="inline-flex items-center gap-1 bg-amber-400 text-[#1e3a5f] hover:bg-amber-300 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs"
              >
                <QrCode size={14} />
                <span>Pay Fee via QR / Online (अनलाइन भुक्तानी)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white font-bold">
                  <tr>
                    <th className="px-3.5 py-3">Date (BS)</th>
                    <th className="px-3.5 py-3">Particulars / Fee Head Description</th>
                    <th className="px-3.5 py-3 text-right">Billed Due (Dr. रू)</th>
                    <th className="px-3.5 py-3 text-right">Paid Amount (Cr. रू)</th>
                    <th className="px-3.5 py-3 text-right">Balance (बक्यौता रू)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!studentLedgerData?.items || studentLedgerData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No fee dues or payment records found.
                      </td>
                    </tr>
                  ) : (
                    studentLedgerData.items.map((item: any) => (
                      <tr key={item.id} className={item.type === 'PAYMENT' ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                        <td className="px-3.5 py-3 font-mono font-bold text-gray-800">{item.dateBs}</td>
                        <td className="px-3.5 py-3 font-bold text-gray-900">
                          {item.particulars}
                          {item.remarks && <span className="text-[10px] text-gray-500 block italic font-normal">{item.remarks}</span>}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-700">
                          {item.billedAmount > 0 ? `Rs. ${item.billedAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                          {item.paidAmount > 0 ? `Rs. ${item.paidAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-black text-gray-900">
                          Rs. {item.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 5: LIBRARY & BOOKS ──────────────────────── */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Borrowed Books Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <BookMarked size={18} className="text-purple-600" />
                <span>My Borrowed Books (लिएका पुस्तकहरू)</span>
              </h2>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                Active: {activeBorrowedBooks.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Book Title (पुस्तक)</th>
                    <th className="px-4 py-3">Author (लेखक)</th>
                    <th className="px-4 py-3 font-mono">Issued Date (BS)</th>
                    <th className="px-4 py-3 font-mono">Due Date (BS)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {libraryIssues?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No books currently borrowed.
                      </td>
                    </tr>
                  ) : (
                    libraryIssues?.map((iss: any) => (
                      <tr key={iss.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-gray-900">{iss.book?.title}</td>
                        <td className="px-4 py-3 text-gray-600">{iss.book?.author || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{iss.issuedDateBs} BS</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-700">{iss.dueDateBs} BS</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              iss.isReturned
                                ? 'bg-slate-100 text-gray-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {iss.isReturned ? 'RETURNED' : 'ISSUED / WITH STUDENT'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* School Library Catalogue Search */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <BookOpen size={18} className="text-[#1e3a5f]" />
                <span>Search School Library Catalogue (विद्यालयको पुस्तकालय सूची)</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search book, author, ISBN..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-slate-50 focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {libraryBooks?.slice(0, 9).map((b: any) => (
                <div key={b.id} className="p-4 rounded-xl border border-gray-100 bg-slate-50/70 text-xs space-y-1.5">
                  <div className="flex justify-between items-start">
                    <strong className="text-gray-900 font-bold leading-tight">{b.title}</strong>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        (b.availableCopies || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.availableCopies || 0} Avail
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] font-medium">By: {b.author || 'Unknown'}</p>
                  <p className="text-gray-400 font-mono text-[10px]">
                    Shelf: <b>{b.shelfLocation || 'Section A'}</b> • Category: {b.category || 'General'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 6: SCHOOL NOTICES ───────────────────────── */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <span>Official School Notices & Bulletin (सूचना पाटी)</span>
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'GENERAL', 'CLASS', 'EXAM', 'EVENT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setNoticeFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    noticeFilter === f
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {noticesData
              ?.filter((n: any) => noticeFilter === 'ALL' || n.type === noticeFilter)
              .map((n: any) => (
                <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      {n.type || 'GENERAL'}
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-500">{n.postedDateBs} BS</span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#1e3a5f] leading-snug">{n.title}</h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{n.body}</p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Target: {n.targetClass?.name || 'All Students'}</span>
                    <span>School Administration</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 7: STUDENT ID CARD ──────────────────────── */}
      {activeTab === 'idcard' && (
        <div className="space-y-6">
          <div className="no-print flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <span>Student Identity Card (विद्यार्थी परिचय पत्र)</span>
              </h2>
              <p className="text-xs text-gray-500">Official printable pocket identity card</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 shadow-xs transition"
              >
                <Camera size={14} />
                <span>Change Photo (≤50KB)</span>
              </button>
              <button
                onClick={triggerStudentIdCardPrint}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                <Printer size={15} />
                <span>Print ID Card (परिचय पत्र प्रिन्ट)</span>
              </button>
            </div>
          </div>

          {/* ID CARD VISUAL DISPLAY */}
          <div className="flex justify-center p-4">
            <div className="printable-document w-full max-w-sm rounded-2xl border-4 border-[#1e3a5f] bg-white shadow-xl overflow-hidden print:border-2 print:shadow-none">
              {/* ID Card Header */}
              <div className="bg-[#1e3a5f] text-white p-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                    {school?.logoUrl ? (
                      <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs">🇳🇵</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-tight">{school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}</h3>
                    <p className="text-[9px] text-amber-300 font-nepali">{school?.nameNepali || 'नेपाल आदर्श मा.वि.'}</p>
                  </div>
                </div>
                <div className="inline-block bg-amber-400 text-[#1e3a5f] text-[9px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider mt-1">
                  STUDENT IDENTITY CARD
                </div>
              </div>

              {/* ID Card Body */}
              <div className="p-4 space-y-3 bg-gradient-to-b from-white to-slate-50 text-xs">
                <div className="flex gap-3 items-center">
                  {/* Student Photo with Upload Trigger */}
                  <div
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="relative h-22 w-20 shrink-0 rounded-xl border-2 border-[#1e3a5f] bg-slate-100 overflow-hidden flex items-center justify-center shadow-xs cursor-pointer group"
                    title="Click to update photo (≤ 50 KB)"
                  >
                    {student?.photoUrl ? (
                      <img src={student.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                    ) : (
                      <User size={36} className="text-gray-400" />
                    )}
                    <div className="no-print absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition">
                      Edit
                    </div>
                  </div>

                  {/* Quick details */}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 truncate uppercase">{student?.fullName}</h4>
                    {student?.fullNameNepali && (
                      <p className="text-[10px] text-gray-600 font-nepali truncate">{student.fullNameNepali}</p>
                    )}
                    <p className="text-[11px] font-bold text-[#1e3a5f]">
                      Class: <strong>{className} ({section})</strong>
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-700">
                      Roll No: <strong>{rollNo}</strong> • Blood: <strong className="text-rose-600">{student?.bloodGroup || 'O+'}</strong>
                    </p>
                  </div>
                </div>

                {/* Additional Info Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Symbol No:</span>
                    <strong className="font-mono text-[#1e3a5f] font-black">{symbolNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Student ID / EMIS:</span>
                    <strong className="font-mono text-gray-700">{student?.studentId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Date of Birth:</span>
                    <strong className="font-mono text-gray-800">{student?.dateOfBirthBs || '2068-05-12'} BS</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Guardian Contact:</span>
                    <strong className="font-mono text-gray-800">{student?.guardianContact || student?.phone || '98XXXXXXXX'}</strong>
                  </div>
                </div>

                {/* Seal & Signature */}
                <div className="flex items-end justify-between pt-2 border-t border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-[#1e3a5f] flex items-center justify-center text-[7px] text-[#1e3a5f] font-bold text-center">
                      SEAL<br/>छाप
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="border-t border-gray-700 pt-0.5 font-bold text-[9px]">
                      Principal / Head Teacher
                    </div>
                    <span className="text-[8px] text-gray-400 font-mono">Academic Year: {yearName} BS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB: CLASS ROUTINE ─────────────────────────── */}
      {activeTab === 'routine' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
            {/* Header with Mode Switcher and Print */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Clock className="text-[#1e3a5f]" size={20} />
                  <span>My Class Routine & Timetable (कक्षा समय-तालिका)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali mt-0.5">
                  कक्षा: <strong className="text-gray-800">{className} ({section})</strong> • दैनिक तथा साप्ताहिक घण्टी विभाजन, विषय तथा शिक्षक विवरण
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Switcher */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRoutineViewMode('day')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      routineViewMode === 'day'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>☀️ दिन अनुसार (Day View)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutineViewMode('week')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      routineViewMode === 'week'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>📋 सम्पूर्ण हप्ता (Week View)</span>
                  </button>
                </div>

                {/* Print Timetable */}
                <button
                  type="button"
                  onClick={triggerStudentRoutinePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                >
                  <Printer size={14} className="text-blue-600" />
                  <span>प्रिन्ट गर्नुहोस् (Print)</span>
                </button>
              </div>
            </div>

            {/* Day Selector Pills Bar (Strictly Checked / Scheduled Days) */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-gray-200">
              <span className="text-xs font-black text-[#1e3a5f] px-2 flex items-center gap-1">
                <Calendar size={14} className="text-blue-600" />
                <span>बार छान्नुहोस्:</span>
              </span>

              {/* Today shortcut pill */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRoutineDay(todayDayNum);
                  setRoutineViewMode('day');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                  selectedRoutineDay === todayDayNum && routineViewMode === 'day'
                    ? 'bg-amber-400 text-[#1e3a5f] ring-2 ring-amber-300'
                    : 'bg-amber-100/70 hover:bg-amber-200 text-amber-900'
                }`}
              >
                <span>☀️ आज ({SHORT_DAYS_MAP[todayDayNum] || 'Today'})</span>
              </button>

              {/* Active Days Buttons (Strictly show checked / scheduled days) */}
              {activeStudentRoutineDays.map((d) => {
                const count = (classRoutine || []).filter((r: any) => r.dayOfWeek === d && !r.isBreak).length;
                const isSelected = selectedRoutineDay === d && routineViewMode === 'day';
                const isToday = d === todayDayNum;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedRoutineDay(d);
                      setRoutineViewMode('day');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                        : isToday
                        ? 'bg-white text-[#1e3a5f] border-amber-300 ring-1 ring-amber-300 hover:bg-amber-50'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{SHORT_DAYS_MAP[d]}</span>
                    {count > 0 ? (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {count}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400">विश्राम</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading & Empty states */}
            {isRoutineLoading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs">कक्षा रुटिन लोड हुँदैछ...</p>
              </div>
            ) : !classRoutine || classRoutine.length === 0 ? (
              <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
                <Clock size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">यो कक्षाको रुटिन तयार गरिएको छैन।</p>
                <p className="text-xs text-gray-400">प्रशासनले रुटिन अद्यावधिक गरेपछि यहाँ तालिका देखिनेछ।</p>
              </div>
            ) : routineViewMode === 'day' ? (
              /* ─── SINGLE DAY VIEW ─── */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-600 animate-ping" />
                    <h3 className="text-sm font-black text-[#1e3a5f]">
                      {DAYS_MAP[selectedRoutineDay]} को कक्षा तालिका
                    </h3>
                    {selectedRoutineDay === todayDayNum && (
                      <span className="text-[10px] font-extrabold bg-amber-400 text-[#1e3a5f] px-2 py-0.5 rounded-full shadow-2xs">
                        आज (Today)
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-blue-900 bg-white px-3 py-1 rounded-xl border border-blue-200">
                    कुल {routinePeriodsForDay.filter((r: any) => !r.isBreak).length} घण्टी तालिका
                  </span>
                </div>

                {routinePeriodsForDay.length === 0 ? (
                  /* Special Friendly Empty Banner for Saturday / Sunday / Off Days */
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-b from-slate-50 to-white space-y-2">
                    <Sparkles size={32} className="mx-auto text-amber-500 mb-1" />
                    <p className="text-sm font-extrabold text-gray-800">
                      {selectedRoutineDay === 7 || selectedRoutineDay === 1
                        ? `✨ यस दिन (${DAYS_MAP[selectedRoutineDay]}) विद्यालयमा कक्षा सञ्चालन छैन (Holiday / No Class)!`
                        : `✨ यस दिन (${DAYS_MAP[selectedRoutineDay]}) कुनै कक्षा तालिका छैन (Free Day)!`}
                    </p>
                    <p className="text-xs text-gray-500 font-nepali max-w-md mx-auto">
                      अन्य दिनहरूको रुटिन हेर्न माथिका बारहरूमा क्लिक गर्नुहोस् वा सम्पूर्ण हप्ताको तालिका हेर्नुहोस्।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routinePeriodsForDay.map((r: any) => (
                      <div
                        key={r.id}
                        className={`rounded-2xl border p-4 shadow-2xs space-y-3 transition ${
                          r.isBreak
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-200'
                            : 'bg-gradient-to-br from-white to-blue-50/30 border-blue-200 hover:border-blue-400'
                        }`}
                      >
                        {r.isBreak ? (
                          <div className="py-2 text-center space-y-1">
                            <span className="text-sm font-black text-amber-900">
                              ☕ {r.breakTitle || 'खाजा समय (Tiffin Break)'}
                            </span>
                            <span className="text-xs font-mono font-bold block text-amber-800">
                              {r.startTime} - {r.endTime}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                              <span className="font-black text-xs text-[#1e3a5f] bg-blue-100/70 px-2.5 py-0.5 rounded-lg">
                                घण्टी {r.periodNo} (Period {r.periodNo})
                              </span>
                              <span className="text-[11px] font-mono font-bold text-gray-600">
                                {r.startTime} - {r.endTime}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-gray-900">विषय (Subject):</span>
                                <span className="text-xs font-black text-blue-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {r.subject?.name || '—'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-gray-900">शिक्षक (Teacher):</span>
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {r.teacher?.fullName || 'तोकिएको छैन'}
                                </span>
                              </div>
                              {r.roomNo && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-gray-900">कोठा नं (Room):</span>
                                  <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Room {r.roomNo}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ─── FULL WEEK VIEW (Filtered to Checked / Scheduled Days) ─── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStudentRoutineDays.map((day) => {
                  const dayEntries = classRoutine.filter((r: any) => r.dayOfWeek === day);
                  const isToday = day === todayDayNum;

                  return (
                    <div
                      key={day}
                      className={`rounded-2xl border p-4 space-y-3 transition ${
                        isToday
                          ? 'border-amber-300 bg-amber-50/30 ring-2 ring-amber-300 shadow-xs'
                          : 'border-gray-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-[#1e3a5f]">{DAYS_MAP[day]}</span>
                          {isToday && (
                            <span className="text-[9px] font-extrabold bg-amber-400 text-[#1e3a5f] px-1.5 py-0.2 rounded-full">
                              आज
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dayEntries.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {dayEntries.length} Periods
                        </span>
                      </div>

                      {dayEntries.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">कुनै घण्टी छैन</p>
                      ) : (
                        <div className="space-y-2">
                          {dayEntries.map((r: any) => (
                            <div
                              key={r.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                r.isBreak
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-900 font-bold text-center'
                                  : 'bg-white border-gray-200/90 shadow-2xs'
                              }`}
                            >
                              {r.isBreak ? (
                                <div className="py-0.5">
                                  <span>☕ {r.breakTitle || 'खाजा समय (Break)'}</span>
                                  <span className="text-[10px] font-mono block text-amber-700">
                                    {r.startTime} - {r.endTime}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-gray-900">
                                      घण्टी {r.periodNo} ({r.startTime} - {r.endTime})
                                    </span>
                                    {r.roomNo && (
                                      <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded">
                                        Room: {r.roomNo}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-gray-600">
                                    <span className="font-bold text-blue-900">{r.subject?.name || 'विषय'}</span>
                                    <span className="text-emerald-700 font-semibold">{r.teacher?.fullName || 'शिक्षक'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB: LEAVE APPLICATION ───────────────────────── */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Apply Leave Form */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText size={18} className="text-amber-500" />
                <span>Apply for Leave (बिदाको निवेदन)</span>
              </h2>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <b>नियम:</b> तपाईंको बिदा निवेदन सम्बन्धित <b>कक्षा शिक्षक (Class Teacher)</b> ले मात्र स्वीकृत गर्न सक्नुहुनेछ।
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyLeaveMutation.mutate();
                }}
                className="space-y-3.5 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2083-05-15"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2083-05-16"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">कुल दिन (Total Days) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={leaveDaysCount}
                    onChange={(e) => setLeaveDaysCount(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन (Reason / Application) *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="आदरणीय कक्षा शिक्षक ज्यू, मलाई स्वास्थ्यमा समस्या आएको / घरायसी काम परेको हुनाले बिदा स्वीकृत गरिदिनुहुन विनम्र अनुरोध गर्दछु।"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {applyLeaveMutation.isPending ? 'दर्ता हुँदैछ...' : 'बिदा निवेदन पेश गर्नुहोस् (Submit Leave)'}
                </button>
              </form>
            </div>

            {/* Leave History List */}
            <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <CalendarCheck size={18} className="text-emerald-600" />
                <span>My Leave History & Approval Status (बिदाको स्थिति)</span>
              </h2>

              {isLeavesLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="mt-2 text-xs">अभिलेख लोड हुँदैछ...</p>
                </div>
              ) : !myLeaves || myLeaves.length === 0 ? (
                <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">कुनै बिदा आवेदन फेला परेन।</p>
                  <p className="text-xs text-gray-400">तपाईंले दिएका बिदा निवेदनहरू यहाँ देखिनेछन्।</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myLeaves.map((l: any) => (
                    <div key={l.id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900">
                          {l.startDateBs} देखि {l.endDateBs} सम्म ({l.totalDays} दिन)
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.status === 'APPROVED'
                              ? '✓ स्वीकृत (Approved)'
                              : l.status === 'REJECTED'
                              ? '✕ अस्वीकृत (Rejected)'
                              : '⏳ विचाराधीन (Pending)'}
                          </span>
                          {l.status === 'PENDING' && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLeave(l);
                                  setEditLeaveStartDate(l.startDateBs);
                                  setEditLeaveEndDate(l.endDateBs);
                                  setEditLeaveDaysCount(l.totalDays || 1);
                                  setEditLeaveReason(l.reason);
                                  setIsEditLeaveModalOpen(true);
                                }}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-[11px] font-bold transition flex items-center gap-1"
                              >
                                ✏️ सम्पादन (Edit)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('के तपाईं यो बिदाको निवेदन रद्द गर्न चाहनुहुन्छ?')) {
                                    deleteLeaveMutation.mutate(l.id);
                                  }
                                }}
                                disabled={deleteLeaveMutation.isPending}
                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                              >
                                🗑️ रद्द (Cancel)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">कारण: {l.reason}</p>
                      {l.reviewedByName && (
                        <p className="text-[11px] text-gray-500 font-nepali">
                          स्वीकृत/अस्वीकृत: <b>{l.reviewedByName}</b> {l.reviewRemarks && `| कैफियत: ${l.reviewRemarks}`}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono block">
                        आवेदन मिति: {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT LEAVE MODAL (STUDENT) ─────────────────────────────────── */}
      {isEditLeaveModalOpen && editingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1e3a5f]">बिदाको निवेदन सम्पादन (Edit Leave)</h3>
                <p className="text-[11px] text-gray-500">कक्षा शिक्षकले निर्णय लिनु अघि परिमार्जन गर्नुहोस्</p>
              </div>
              <button
                onClick={() => {
                  setIsEditLeaveModalOpen(false);
                  setEditingLeave(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLeaveMutation.mutate({
                  id: editingLeave.id,
                  data: {
                    startDateBs: editLeaveStartDate,
                    endDateBs: editLeaveEndDate,
                    totalDays: editLeaveDaysCount,
                    reason: editLeaveReason,
                  },
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={editLeaveStartDate}
                    onChange={(e) => setEditLeaveStartDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={editLeaveEndDate}
                    onChange={(e) => setEditLeaveEndDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कुल दिन (Total Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editLeaveDaysCount}
                  onChange={(e) => setEditLeaveDaysCount(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन *</label>
                <textarea
                  required
                  rows={4}
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditLeaveModalOpen(false);
                    setEditingLeave(null);
                  }}
                  className="px-4 py-2 border rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={updateLeaveMutation.isPending}
                  className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold rounded-xl shadow-xs disabled:opacity-60"
                >
                  {updateLeaveMutation.isPending ? 'सुरक्षित हुँदैछ...' : 'परिमार्जन सुरक्षित गर्नुहोस् (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3. PRINTABLE FEE RECEIPT MODAL ─────────────────────────────── */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="no-print flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Official Fee Receipt (शुल्क रसिद)</span>
              <button onClick={() => setSelectedReceiptForPrint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div className="printable-document p-6 border-2 border-[#1e3a5f] rounded-xl space-y-4 bg-amber-50/10 text-xs">
              <div className="text-center border-b border-[#1e3a5f] pb-3 space-y-0.5">
                <h3 className="text-base font-black text-[#1e3a5f] uppercase">{school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}</h3>
                <p className="text-[10px] text-gray-600 font-nepali">{school?.nameNepali || 'नेपाल आदर्श मा.वि.'}</p>
                <div className="inline-block bg-[#1e3a5f] text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase mt-1">
                  OFFICIAL FEE RECEIPT (शुल्क रसिद)
                </div>
              </div>

              <div className="flex justify-between font-mono text-[11px]">
                <span>Receipt No: <b>{selectedReceiptForPrint.receiptNo}</b></span>
                <span>Date: <b>{selectedReceiptForPrint.paidDateBs} BS</b></span>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student Name:</span>
                  <strong className="text-gray-900">{student?.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class & Roll:</span>
                  <strong>{className} ({section}) • Roll #{rollNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Head:</span>
                  <strong>{selectedReceiptForPrint.feeHead?.name}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-700 font-bold">Total Amount Paid:</span>
                  <strong className="font-mono text-base font-black text-emerald-700">
                    रू {selectedReceiptForPrint.amount?.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 pt-6 items-end">
                <div className="text-left">
                  <div className="h-10 w-10 border border-dashed border-[#1e3a5f] rounded-full flex items-center justify-center text-[7px] text-[#1e3a5f]">
                    SEAL
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-t border-gray-600 pt-0.5 font-bold text-[10px]">
                    Authorized Signature (लेखापाल)
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReceiptForPrint(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={triggerStudentReceiptPrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Receipt (प्रिन्ट)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. PHOTO UPLOAD & WEBCAM CAPTURE MODAL ─────────────────────── */}
      {student && (
        <StudentPhotoUploadModal
          studentId={student.id}
          studentName={student.fullName}
          currentPhotoUrl={student.photoUrl}
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onSuccess={(newPhotoUrl) => {
            queryClient.invalidateQueries({ queryKey: ['student-me'] });
            queryClient.invalidateQueries({ queryKey: ['student-marksheet'] });
          }}
        />
      )}
    </div>
  );
}
