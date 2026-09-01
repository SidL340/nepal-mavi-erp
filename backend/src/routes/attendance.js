const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Nepali date to AD approximate converter (simplified — use a proper library in production)
// We store both BS and AD side by side
function todayAD() { return new Date(); }

// POST /api/attendance — mark attendance for a class on a date
router.post('/', authenticate, async (req, res) => {
  try {
    // entries: [{ studentId, status, remark, leaveType }]
    const { classId, dateBs, dateAd, entries } = req.body;
    const teacherId = req.user.teacher?.id || null;

    // Strict Permission: Only Assigned Class Teacher or ADMIN can take attendance
    if (req.user.role === 'TEACHER') {
      if (!teacherId) {
        return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
      }
      const targetClass = await prisma.class.findUnique({
        where: { id: parseInt(classId) },
        select: { id: true, name: true, classTeacherId: true, classTeacher: { select: { fullName: true } } },
      });
      if (!targetClass) {
        return res.status(404).json({ success: false, message: 'Class not found.' });
      }
      if (targetClass.classTeacherId !== teacherId) {
        const assignedName = targetClass.classTeacher?.fullName || 'another teacher';
        return res.status(403).json({
          success: false,
          message: `Permission Denied: Only the assigned Class Teacher (${assignedName}) can take attendance for ${targetClass.name}.`,
        });
      }
    }

    const results = [];
    for (const entry of entries) {
      const saved = await prisma.attendance.upsert({
        where: { studentId_dateBs: { studentId: entry.studentId, dateBs } },
        update: {
          status: entry.status || 'PRESENT',
          remark: entry.remark,
          leaveType: entry.leaveType,
          teacherId,
        },
        create: {
          studentId: entry.studentId,
          classId: parseInt(classId),
          dateBs,
          dateAd: new Date(dateAd),
          status: entry.status || 'PRESENT',
          remark: entry.remark,
          leaveType: entry.leaveType,
          teacherId,
        },
      });
      results.push(saved);

      // Auto-notice on ABSENT
      if (entry.status === 'ABSENT') {
        const student = await prisma.student.findUnique({
          where: { id: entry.studentId },
          select: { fullName: true, guardianContact: true, guardianName: true },
        });
        await prisma.notice.create({
          data: {
            title: `Absent Notice — ${student?.fullName}`,
            body: `Dear Parent/Guardian, ${student?.fullName} was marked ABSENT on ${dateBs}. Please contact the school if this is unexpected.`,
            type: 'ABSENT_ALERT',
            targetStudentId: entry.studentId,
            isAutomatic: true,
            postedDateBs: dateBs,
          },
        }).catch(() => {}); // Don't fail attendance save if notice fails
      }
    }
    return res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/class/:classId?dateBs=2081-05-15
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { dateBs } = req.query;
    const classId = parseInt(req.params.classId);

    // Get students
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, studentId: true, photoUrl: true } } },
      orderBy: { rollNo: 'asc' },
    });

    let existingAttendance = [];
    if (dateBs) {
      existingAttendance = await prisma.attendance.findMany({
        where: { classId, dateBs },
      });
    }
    const attMap = {};
    existingAttendance.forEach(a => { attMap[a.studentId] = a; });

    return res.json({
      success: true,
      data: enrollments.map(e => ({
        ...e.student,
        rollNo: e.rollNo,
        attendance: attMap[e.studentId] || null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/student/:studentId?monthBs=2081-05
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { monthBs, yearBs } = req.query;
    const where = { studentId: parseInt(req.params.studentId) };
    if (monthBs) where.dateBs = { startsWith: monthBs };
    else if (yearBs) where.dateBs = { startsWith: yearBs };

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { dateBs: 'asc' },
    });

    // Summary
    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      leave: records.filter(r => r.status === 'LEAVE').length,
      bunked: records.filter(r => r.status === 'BUNKED').length,
    };
    summary.percentage = summary.total > 0
      ? +((summary.present + summary.late) / summary.total * 100).toFixed(2)
      : 0;

    return res.json({ success: true, data: records, summary });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/monthly-report/:classId?monthBs=2081-05
router.get('/monthly-report/:classId', authenticate, async (req, res) => {
  try {
    const { monthBs } = req.query;
    const classId = parseInt(req.params.classId);

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, studentId: true } } },
    });

    const records = await prisma.attendance.findMany({
      where: {
        classId,
        dateBs: monthBs ? { startsWith: monthBs } : undefined,
      },
    });

    const report = enrollments.map(e => {
      const studentRecords = records.filter(r => r.studentId === e.studentId);
      return {
        studentId: e.student.studentId,
        fullName: e.student.fullName,
        total: studentRecords.length,
        present: studentRecords.filter(r => r.status === 'PRESENT').length,
        absent: studentRecords.filter(r => r.status === 'ABSENT').length,
        late: studentRecords.filter(r => r.status === 'LATE').length,
        leave: studentRecords.filter(r => r.status === 'LEAVE').length,
        percentage: studentRecords.length > 0
          ? +((studentRecords.filter(r => ['PRESENT','LATE'].includes(r.status)).length / studentRecords.length) * 100).toFixed(1)
          : 0,
      };
    });

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/yearly-report/:classId?yearBs=2083
router.get('/yearly-report/:classId', authenticate, async (req, res) => {
  try {
    const { yearBs } = req.query;
    const classId = parseInt(req.params.classId);

    let enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, fullNameNepali: true, studentId: true } } },
      orderBy: { rollNo: 'asc' },
    });

    // Fallback if classEnrollment table returns empty for this classId
    if (enrollments.length === 0) {
      const directStudents = await prisma.student.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, fullNameNepali: true, studentId: true },
        take: 100,
      });
      enrollments = directStudents.map((st, idx) => ({
        rollNo: idx + 1,
        studentId: st.id,
        student: st,
      }));
    }

    const records = await prisma.attendance.findMany({
      where: {
        classId,
        dateBs: yearBs ? { startsWith: yearBs } : undefined,
      },
    });

    // Find unique operating days for the class in that year
    const uniqueDays = new Set(records.map(r => r.dateBs));
    const totalWorkingDays = uniqueDays.size;

    const report = enrollments.map(e => {
      const studentRecords = records.filter(r => r.studentId === e.studentId);
      const presentCount = studentRecords.filter(r => r.status === 'PRESENT').length;
      const lateCount = studentRecords.filter(r => r.status === 'LATE').length;
      const absentCount = studentRecords.filter(r => r.status === 'ABSENT' || r.status === 'BUNKED').length;
      const leaveCount = studentRecords.filter(r => r.status === 'LEAVE').length;

      const effectiveTotal = studentRecords.length || totalWorkingDays || 0;
      const attendedDays = presentCount + lateCount;
      const percentage = effectiveTotal > 0 ? +((attendedDays / effectiveTotal) * 100).toFixed(1) : 0;

      let grade = 'न्यून (Low)';
      if (effectiveTotal === 0) grade = 'बाँकी (Pending)';
      else if (percentage >= 90) grade = 'उत्कृष्ट (Outstanding)';
      else if (percentage >= 80) grade = 'उत्तम (Very Good)';
      else if (percentage >= 70) grade = 'मध्यम (Good)';

      return {
        studentId: e.student.studentId,
        fullName: e.student.fullName,
        fullNameNepali: e.student.fullNameNepali,
        rollNo: e.rollNo,
        totalDays: effectiveTotal,
        presentDays: presentCount,
        lateDays: lateCount,
        absentDays: absentCount,
        leaveDays: leaveCount,
        attendedDays,
        percentage,
        grade,
      };
    });

    return res.json({
      success: true,
      data: report,
      totalWorkingDays,
      academicYearBs: yearBs || 'All Years',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
