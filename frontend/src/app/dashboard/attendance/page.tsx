'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import {
  CalendarCheck,
  Users,
  Check,
  X,
  Clock,
  UserX,
  FileText,
  AlertCircle,
  Save,
  CheckCheck,
  Lock,
  Printer,
  FileSpreadsheet,
  Award,
  BarChart2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'BUNKED';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const teacherId = user?.teacher?.id;

  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [dateBs, setDateBs] = useState<string>(todayBS());
  const [attendanceMap, setAttendanceMap] = useState<Record<number, { status: AttendanceStatus; remark: string; leaveType: string }>>({});
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // Monthly Tab State
  const [monthlyClassId, setMonthlyClassId] = useState<string>('');
  const [monthlyBs, setMonthlyBs] = useState<string>(todayBS().slice(0, 7));

  // Yearly Tab State
  const [yearlyClassId, setYearlyClassId] = useState<string>('');
  const [yearlyBs, setYearlyBs] = useState<string>(todayBS().slice(0, 4));

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Set default selected class when classes load
  useEffect(() => {
    if (classesData?.length > 0 && !selectedClass) {
      const myAssignedClass = isTeacher && teacherId
        ? classesData.find((c: any) => c.classTeacherId === teacherId)
        : null;
      const target = myAssignedClass || classesData[0];
      setSelectedClass(target.id.toString());
      setMonthlyClassId(target.id.toString());
      setYearlyClassId(target.id.toString());
    }
  }, [classesData, selectedClass, isTeacher, teacherId]);

  const currentClassObj = classesData?.find((c: any) => c.id.toString() === selectedClass);
  const isClassTeacher = isAdmin || (isTeacher && currentClassObj?.classTeacherId === teacherId);
  const assignedTeacherName = currentClassObj?.classTeacher?.fullName || 'तोकिएको छैन';

  // Fetch students & existing attendance for selected class and date
  const { data: classStudents, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['attendance-class', selectedClass, dateBs],
    queryFn: async () => {
      if (!selectedClass) return [];
      const res = await api.get(`/attendance/class/${selectedClass}?dateBs=${dateBs}`);
      return res.data?.data || [];
    },
    enabled: !!selectedClass,
  });

  // Fetch Monthly Report
  const { data: monthlyReportData, isLoading: isMonthlyLoading } = useQuery({
    queryKey: ['attendance-monthly-report', monthlyClassId, monthlyBs],
    queryFn: async () => {
      if (!monthlyClassId) return [];
      const res = await api.get(`/attendance/monthly-report/${monthlyClassId}?monthBs=${monthlyBs}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'monthly' && !!monthlyClassId,
  });

  // Fetch Yearly Report
  const { data: yearlyReportRes, isLoading: isYearlyLoading } = useQuery({
    queryKey: ['attendance-yearly-report', yearlyClassId, yearlyBs],
    queryFn: async () => {
      if (!yearlyClassId) return { data: [], totalWorkingDays: 0 };
      const res = await api.get(`/attendance/yearly-report/${yearlyClassId}?yearBs=${yearlyBs}`);
      return res.data || { data: [], totalWorkingDays: 0 };
    },
    enabled: !!yearlyClassId,
  });

  const yearlyReport = yearlyReportRes?.data || [];
  const yearlyWorkingDays = yearlyReportRes?.totalWorkingDays || 0;

  // Initialize or update attendance map with DEFAULT = PRESENT
  useEffect(() => {
    if (classStudents && classStudents.length > 0) {
      const map: Record<number, { status: AttendanceStatus; remark: string; leaveType: string }> = {};
      classStudents.forEach((st: any) => {
        if (st.attendance) {
          map[st.id] = {
            status: st.attendance.status as AttendanceStatus,
            remark: st.attendance.remark || '',
            leaveType: st.attendance.leaveType || '',
          };
        } else {
          map[st.id] = {
            status: 'PRESENT',
            remark: '',
            leaveType: '',
          };
        }
      });
      setAttendanceMap(map);
    }
  }, [classStudents]);

  // Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(attendanceMap).map(([studentId, val]) => ({
        studentId: parseInt(studentId),
        status: val.status,
        remark: val.remark,
        leaveType: val.leaveType,
      }));

      const res = await api.post('/attendance', {
        classId: parseInt(selectedClass),
        dateBs,
        dateAd: new Date().toISOString().slice(0, 10),
        entries,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Attendance saved for ${data.count} students!`);
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    },
  });

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (!classStudents) return;
    const map: Record<number, { status: AttendanceStatus; remark: string; leaveType: string }> = {};
    classStudents.forEach((st: any) => {
      map[st.id] = {
        ...(attendanceMap[st.id] || { remark: '', leaveType: '' }),
        status: 'PRESENT',
      };
    });
    setAttendanceMap(map);
    toast.success('Marked all students as Present!');
  };

  // Export Yearly Report to Excel
  const handleExportYearlyExcel = () => {
    try {
      const headers = ['Roll No', 'EMIS ID', 'Student Full Name', 'Total Working Days', 'Present Days', 'Absent Days', 'Leave Days', 'Attended Days', 'Attendance %', 'Evaluation Grade'];
      const rows = yearlyReport.map((s: any) => [
        s.rollNo || '',
        `"${s.studentId}"`,
        `"${s.fullName.replace(/"/g, '""')}"`,
        s.totalDays,
        s.presentDays,
        s.absentDays,
        s.leaveDays,
        s.attendedDays,
        `${s.percentage}%`,
        `"${s.grade}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Yearly_Attendance_Report_Class_${yearlyClassId}_${yearlyBs}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Yearly attendance exported to Excel!');
    } catch (err) {
      toast.error('Failed to export yearly attendance.');
    }
  };

  // Standalone Print Engine for Monthly Attendance Report
  const triggerMonthlyAttendancePrint = () => {
    if (!monthlyReportData || monthlyReportData.length === 0) {
      toast.error('No monthly attendance data to print.');
      return;
    }

    const currentMonthlyClass = classesData?.find((c: any) => c.id.toString() === monthlyClassId);
    const classNameStr = currentMonthlyClass ? `${currentMonthlyClass.name} ${currentMonthlyClass.section ? `(${currentMonthlyClass.section})` : ''}` : 'Class';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = monthlyReportData
      .map(
        (s: any, idx: number) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td><strong>${s.fullName}</strong></td>
          <td style="font-family: monospace;">${s.studentId}</td>
          <td style="text-align: center; font-weight: bold;">${s.total}</td>
          <td style="text-align: center; color: #15803d; font-weight: bold;">${s.present}</td>
          <td style="text-align: center; color: #b91c1c; font-weight: bold;">${s.absent}</td>
          <td style="text-align: center; color: #b45309;">${s.late}</td>
          <td style="text-align: center; color: #1d4ed8;">${s.leave}</td>
          <td style="text-align: right; font-weight: 900; color: #1e3a5f;">${s.percentage}%</td>
        </tr>
      `
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Attendance Ledger - Shree Nepal Secondary School</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { width: 50px; height: 50px; border-radius: 50%; border: 1px solid #f59e0b; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; margin: 4px 0 2px; }
            .school-sub { font-size: 11px; font-weight: 700; color: #4b5563; }
            .report-title { font-size: 13px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 4px 12px; border-radius: 4px; margin-top: 6px; text-transform: uppercase; border: 1px solid #bfdbfe; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #1e3a5f; color: #fff; padding: 8px 6px; text-align: left; font-size: 10.5px; }
            td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 4px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/school_logo.png" class="logo" alt="School Seal" />
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div class="school-sub">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
            <div class="report-title">मासिक विद्यार्थी हाजिरी विवरण (Monthly Attendance Ledger)</div>
          </div>

          <div class="meta-grid">
            <div><strong>कक्षा (Class):</strong> ${classNameStr}</div>
            <div><strong>मासिक महिना (Month BS):</strong> ${monthlyBs}</div>
            <div><strong>कुल विद्यार्थी (Total Students):</strong> ${monthlyReportData.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">क्र.स.</th>
                <th>विद्यार्थीको नाम (Student Name)</th>
                <th>EMIS/ID Code</th>
                <th style="text-align: center;">सञ्चालन दिन</th>
                <th style="text-align: center;">उपस्थित</th>
                <th style="text-align: center;">अनुपस्थित</th>
                <th style="text-align: center;">ढिलो</th>
                <th style="text-align: center;">विदा</th>
                <th style="text-align: right;">उपस्थिति %</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-line">कक्षा शिक्षकको दस्तखत<br>(Class Teacher Signature)</div>
            <div class="sig-line">प्रधानाध्यापकको दस्तखत तथा छाप<br>(Headmaster / School Stamp)</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Standalone Print Engine for Yearly Attendance Report
  const triggerYearlyAttendancePrint = () => {
    if (!yearlyReport || yearlyReport.length === 0) {
      toast.error('No yearly attendance data to print.');
      return;
    }

    const currentYearlyClass = classesData?.find((c: any) => c.id.toString() === yearlyClassId);
    const classNameStr = currentYearlyClass ? `${currentYearlyClass.name} ${currentYearlyClass.section ? `(${currentYearlyClass.section})` : ''}` : 'Class';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = yearlyReport
      .map(
        (s: any) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${s.rollNo || '—'}</td>
          <td>
            <strong>${s.fullName}</strong><br>
            <span style="font-size: 9px; color: #64748b; font-family: monospace;">ID: ${s.studentId}</span>
          </td>
          <td style="text-align: center; font-weight: bold;">${s.totalDays}</td>
          <td style="text-align: center; color: #15803d; font-weight: bold;">${s.presentDays}</td>
          <td style="text-align: center; color: #b91c1c; font-weight: bold;">${s.absentDays}</td>
          <td style="text-align: center; color: #1d4ed8;">${s.leaveDays}</td>
          <td style="text-align: center; font-weight: 900; color: #1e3a5f;">${s.attendedDays}</td>
          <td style="text-align: right; font-weight: 900; font-size: 12px; color: #15803d;">${s.percentage}%</td>
          <td style="text-align: center; font-weight: 900;">${s.grade}</td>
        </tr>
      `
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Annual Attendance Calculation Ledger - Shree Nepal Secondary School</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { width: 50px; height: 50px; border-radius: 50%; border: 1px solid #f59e0b; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; margin: 4px 0 2px; }
            .school-sub { font-size: 11px; font-weight: 700; color: #4b5563; }
            .report-title { font-size: 13px; font-weight: 900; background: #fef3c7; color: #78350f; display: inline-block; padding: 4px 12px; border-radius: 4px; margin-top: 6px; text-transform: uppercase; border: 1px solid #fde68a; }
            .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; font-size: 10px; }
            .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc; text-align: center; }
            .stat-val { font-size: 14px; font-weight: 900; color: #1e3a5f; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
            th { background: #1e3a5f; color: #fff; padding: 8px 6px; text-align: left; font-size: 10.5px; }
            td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 4px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/school_logo.png" class="logo" alt="School Seal" />
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट</div>
            <div class="school-sub">Shree Nepal Secondary School, Bishrampur, Rautahat</div>
            <div class="report-title">वार्षिक हाजिरी हिसाब तालिका (Annual Attendance Calculation Ledger)</div>
          </div>

          <div class="stats-bar">
            <div class="stat-box">
              <div>कक्षा / सत्र (Class/Year)</div>
              <div class="stat-val">${classNameStr} (${yearlyBs})</div>
            </div>
            <div class="stat-box">
              <div>कुल सञ्चालन दिन (Working Days)</div>
              <div class="stat-val">${yearlyWorkingDays} Days</div>
            </div>
            <div class="stat-box">
              <div>कक्षा औसत हाजिरी %</div>
              <div class="stat-val">${avgYearlyPercentage}%</div>
            </div>
            <div class="stat-box">
              <div>कुल विद्यार्थी संख्या</div>
              <div class="stat-val">${yearlyReport.length} Students</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Roll No</th>
                <th>विद्यार्थी विवरण (Student Details)</th>
                <th style="text-align: center;">सञ्चालन दिन</th>
                <th style="text-align: center;">उपस्थित</th>
                <th style="text-align: center;">अनुपस्थित</th>
                <th style="text-align: center;">विदा</th>
                <th style="text-align: center;">जम्मा उपस्थिति</th>
                <th style="text-align: right;">वार्षिक %</th>
                <th style="text-align: center;">मूल्याङ्कन</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-line">कक्षा शिक्षकको दस्तखत<br>(Class Teacher Signature)</div>
            <div class="sig-line">प्रधानाध्यापकको दस्तखत तथा छाप<br>(Headmaster / School Stamp)</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Aggregated Counts for Daily Tab
  const counts = {
    present: Object.values(attendanceMap).filter((a) => a.status === 'PRESENT').length,
    absent: Object.values(attendanceMap).filter((a) => a.status === 'ABSENT').length,
    late: Object.values(attendanceMap).filter((a) => a.status === 'LATE').length,
    leave: Object.values(attendanceMap).filter((a) => a.status === 'LEAVE').length,
    bunked: Object.values(attendanceMap).filter((a) => a.status === 'BUNKED').length,
  };

  // Yearly Summary Stats
  const avgYearlyPercentage = yearlyReport.length > 0
    ? (yearlyReport.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / yearlyReport.length).toFixed(1)
    : '0';

  const outstandingStudentsCount = yearlyReport.filter((s: any) => s.percentage >= 90).length;
  const lowAttendanceStudentsCount = yearlyReport.filter((s: any) => s.percentage < 75).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Attendance Portal (दैनिक, मासिक तथा वार्षिक हाजिरी हिसाब)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            कक्षा शिक्षकद्वारा दैनिक हाजिरी, मासिक प्रतिवेदन तथा वर्षभरिको कुल सञ्चालन दिन र प्रतिशत हिसाब
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('daily')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'daily' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily Attendance (दैनिक हाजिरी)
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'monthly' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly Report (मासिक)
          </button>
          <button
            onClick={() => setActiveTab('yearly')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1 ${
              activeTab === 'yearly' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart2 size={13} />
            <span>Yearly Calculation (वार्षिक हिसाब)</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: DAILY ATTENDANCE ────────────────────────────────────────── */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Select Class (कक्षा छान्नुहोस्):</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="erp-input font-bold text-xs"
                >
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''} {c.classTeacher ? `— Teacher: ${c.classTeacher.fullName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Attendance Date BS (मिति):</label>
                <input
                  type="text"
                  value={dateBs}
                  onChange={(e) => setDateBs(e.target.value)}
                  className="erp-input font-mono text-xs font-bold"
                />
              </div>

              {/* Class Teacher Badge */}
              <div className="self-end pb-1 text-xs">
                <span className="text-gray-500 font-bold">Class Teacher: </span>
                <strong className="text-[#1e3a5f] font-bold">{assignedTeacherName}</strong>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <CheckCheck size={14} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                disabled={!isClassTeacher || saveAttendanceMutation.isPending}
                onClick={() => saveAttendanceMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-xs disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance (हाजिरी सेभ)'}</span>
              </button>
            </div>
          </div>

          {!isClassTeacher && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-bold">
              <Lock size={15} />
              <span>Permission Notice: Only assigned Class Teacher ({assignedTeacherName}) or Admin can save attendance.</span>
            </div>
          )}

          {/* Counts Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present (उपस्थित)</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">{counts.present}</p>
            </div>
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-center">
              <span className="text-[10px] font-bold text-rose-700 uppercase block">Absent (अनुपस्थित)</span>
              <p className="text-xl font-black text-rose-900 mt-0.5">{counts.absent}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Late (ढिलो)</span>
              <p className="text-xl font-black text-amber-900 mt-0.5">{counts.late}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Leave (विदा)</span>
              <p className="text-xl font-black text-blue-900 mt-0.5">{counts.leave}</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
              <span className="text-[10px] font-bold text-purple-700 uppercase block">Bunked (भागेको)</span>
              <p className="text-xl font-black text-purple-900 mt-0.5">{counts.bunked}</p>
            </div>
          </div>

          {/* Students Attendance Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-bold">
                <tr>
                  <th className="p-3.5 w-16 text-center">Roll No</th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">EMIS / Student ID</th>
                  <th className="p-3.5 text-center">Attendance Status</th>
                  <th className="p-3.5">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isStudentsLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading class students...</td></tr>
                ) : !classStudents || classStudents.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No students enrolled in this class.</td></tr>
                ) : (
                  classStudents.map((st: any) => {
                    const currentVal = attendanceMap[st.id] || { status: 'PRESENT', remark: '', leaveType: '' };
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-3.5 text-center font-mono font-bold text-gray-800">{st.rollNo || '—'}</td>
                        <td className="p-3.5 font-bold text-gray-900">{st.fullName}</td>
                        <td className="p-3.5 font-mono text-gray-500">{st.studentId}</td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {[
                              { id: 'PRESENT', label: 'Present', color: 'bg-emerald-600 text-white border-emerald-600' },
                              { id: 'ABSENT', label: 'Absent', color: 'bg-rose-600 text-white border-rose-600' },
                              { id: 'LATE', label: 'Late', color: 'bg-amber-500 text-white border-amber-500' },
                              { id: 'LEAVE', label: 'Leave', color: 'bg-blue-600 text-white border-blue-600' },
                            ].map((stBtn) => (
                              <button
                                key={stBtn.id}
                                type="button"
                                onClick={() => handleStatusChange(st.id, stBtn.id as any)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                  currentVal.status === stBtn.id
                                    ? stBtn.color + ' shadow-2xs scale-105'
                                    : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border-gray-200'
                                }`}
                              >
                                {stBtn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="Reason / Note..."
                            value={currentVal.remark}
                            onChange={(e) =>
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [st.id]: { ...prev[st.id], remark: e.target.value },
                              }))
                            }
                            className="erp-input text-xs py-1"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MONTHLY REPORT ─────────────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Class:</label>
                  <select
                    value={monthlyClassId}
                    onChange={(e) => setMonthlyClassId(e.target.value)}
                    className="erp-input font-bold text-xs"
                  >
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Month BS (मिति):</label>
                  <input
                    type="text"
                    placeholder="2083-05"
                    value={monthlyBs}
                    onChange={(e) => setMonthlyBs(e.target.value)}
                    className="erp-input font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <button
                onClick={triggerMonthlyAttendancePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a5280] px-4 py-2 text-xs font-bold transition shadow-2xs self-end sm:self-center"
              >
                <Printer size={15} />
                <span>Print Monthly Sheet (मासिक हाजिरी प्रिन्ट)</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white font-bold">
                <tr>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Student ID</th>
                  <th className="p-3.5 text-center">Total Recorded Days</th>
                  <th className="p-3.5 text-center">Present</th>
                  <th className="p-3.5 text-center">Absent</th>
                  <th className="p-3.5 text-center">Late</th>
                  <th className="p-3.5 text-center">Leave</th>
                  <th className="p-3.5 text-right">Monthly %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isMonthlyLoading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading monthly report...</td></tr>
                ) : monthlyReportData.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">No monthly attendance records found.</td></tr>
                ) : (
                  monthlyReportData.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-gray-900">{s.fullName}</td>
                      <td className="p-3.5 font-mono text-gray-500">{s.studentId}</td>
                      <td className="p-3.5 text-center font-mono font-bold">{s.total}</td>
                      <td className="p-3.5 text-center font-mono text-emerald-700 font-bold">{s.present}</td>
                      <td className="p-3.5 text-center font-mono text-rose-700 font-bold">{s.absent}</td>
                      <td className="p-3.5 text-center font-mono text-amber-700">{s.late}</td>
                      <td className="p-3.5 text-center font-mono text-blue-700">{s.leave}</td>
                      <td className="p-3.5 text-right font-mono font-black text-[#1e3a5f]">{s.percentage}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: YEARLY ATTENDANCE CALCULATION & REPORT ─────────────────── */}
      {activeTab === 'yearly' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Select Class (कक्षा):</label>
                <select
                  value={yearlyClassId}
                  onChange={(e) => setYearlyClassId(e.target.value)}
                  className="erp-input font-bold text-xs"
                >
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Academic Year BS (शैक्षिक सत्र):</label>
                <input
                  type="text"
                  placeholder="2083"
                  value={yearlyBs}
                  onChange={(e) => setYearlyBs(e.target.value)}
                  className="erp-input font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportYearlyExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white px-3.5 py-2 text-xs font-bold transition"
              >
                <FileSpreadsheet size={15} />
                <span>Export Annual Attendance (Excel)</span>
              </button>

              <button
                onClick={triggerYearlyAttendancePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a5280] px-4 py-2 text-xs font-bold transition shadow-2xs"
              >
                <Printer size={15} />
                <span>Print Annual Sheet (वार्षिक हाजिरी प्रिन्ट)</span>
              </button>
            </div>
          </div>

          {/* Yearly Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block">Total Working Days</span>
              <p className="text-2xl font-black text-[#1e3a5f] mt-2 font-mono">{yearlyWorkingDays} Days</p>
              <p className="text-[11px] text-gray-400 mt-1">वर्षभरिको कुल सञ्चालन दिन</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Class Average Attendance %</span>
              <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">{avgYearlyPercentage}%</p>
              <p className="text-[11px] text-gray-400 mt-1">कक्षाको औसत वार्षिक उपस्थिति</p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block">Outstanding (90%+)</span>
              <p className="text-2xl font-black text-purple-900 mt-2 font-mono">{outstandingStudentsCount} Students</p>
              <p className="text-[11px] text-gray-400 mt-1">उत्कृष्ट हाजिरी भएका विद्यार्थीहरू</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">Low Attendance (&lt;75%)</span>
              <p className="text-2xl font-black text-rose-700 mt-2 font-mono">{lowAttendanceStudentsCount} Students</p>
              <p className="text-[11px] text-gray-400 mt-1">न्यून हाजिरी (सचेत गराउनुपर्ने)</p>
            </div>
          </div>

          {/* Yearly Attendance Table */}
          <div className="printable-document rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center no-print">
              <h2 className="font-extrabold text-sm text-[#1e3a5f] flex items-center gap-2">
                <BarChart2 size={16} />
                <span>Annual Attendance Calculation Ledger (वार्षिक हाजिरी हिसाब तालिका - सत्र {yearlyBs})</span>
              </h2>
              <span className="text-xs text-gray-500 font-mono font-bold">Total Students: {yearlyReport.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white font-bold">
                  <tr>
                    <th className="p-3.5 w-16 text-center">Roll No</th>
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5 text-center">Total Days (जम्मा)</th>
                    <th className="p-3.5 text-center">Present (उपस्थित)</th>
                    <th className="p-3.5 text-center">Absent (अनुपस्थित)</th>
                    <th className="p-3.5 text-center">Leave (विदा)</th>
                    <th className="p-3.5 text-center">Attended Days</th>
                    <th className="p-3.5 text-right">Annual Attendance %</th>
                    <th className="p-3.5 text-center">Evaluation Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isYearlyLoading ? (
                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">Calculating yearly attendance...</td></tr>
                  ) : yearlyReport.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">No yearly attendance data recorded.</td></tr>
                  ) : (
                    yearlyReport.map((s: any) => (
                      <tr key={s.studentId} className="hover:bg-slate-50">
                        <td className="p-3.5 text-center font-mono font-bold text-gray-800">{s.rollNo || '—'}</td>
                        <td className="p-3.5">
                          <strong className="font-bold text-gray-900 block">{s.fullName}</strong>
                          <span className="text-[10px] text-gray-500 font-mono">EMIS/ID: {s.studentId}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-gray-700">{s.totalDays}</td>
                        <td className="p-3.5 text-center font-mono font-extrabold text-emerald-700">{s.presentDays}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-700">{s.absentDays}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-700">{s.leaveDays}</td>
                        <td className="p-3.5 text-center font-mono font-extrabold text-[#1e3a5f]">{s.attendedDays}</td>
                        <td className="p-3.5 text-right font-mono font-black text-sm text-emerald-800">
                          {s.percentage}%
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                              s.percentage >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.percentage >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : s.percentage >= 70
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.grade}
                          </span>
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
    </div>
  );
}
