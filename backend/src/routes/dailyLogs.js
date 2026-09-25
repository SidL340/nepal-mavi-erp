const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to get fallback BS date string if none provided
function getTodayBs() {
  const now = new Date();
  return `2083-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ── 1. GET DAILY TEACHING LOGS (ROLE-AWARE) ─────────────────────────────────
// GET /api/daily-logs?dateBs=&classId=&teacherId=&subjectId=&page=&limit=
router.get('/', authenticate, async (req, res) => {
  try {
    const { dateBs, classId, teacherId, subjectId, q, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    // If STUDENT: automatically constrain to their active enrolled class
    if (req.user.role === 'STUDENT') {
      const studentId = req.user.student?.id;
      if (!studentId) {
        return res.status(403).json({ success: false, message: 'Student profile not linked.' });
      }

      const enrollment = await prisma.classEnrollment.findFirst({
        where: { studentId, isActive: true },
        select: { classId: true },
      });

      if (!enrollment) {
        return res.json({
          success: true,
          data: { logs: [], total: 0, page: 1, totalPages: 0, classInfo: null },
        });
      }

      where.classId = enrollment.classId;
    } else if (req.user.role === 'TEACHER') {
      // Force teachers to strictly see only their own teaching logs
      const myTeacherId = req.user.teacher?.id;
      if (!myTeacherId) {
        return res.json({
          success: true,
          data: { logs: [], total: 0, page: 1, totalPages: 0 },
        });
      }
      where.teacherId = myTeacherId;
    } else if (teacherId) {
      where.teacherId = parseInt(teacherId);
    }

    if (classId) where.classId = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (dateBs && dateBs.trim()) where.dateBs = dateBs.trim();

    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { topicTaught: { contains: search } },
        { homework: { contains: search } },
        { subjectName: { contains: search } },
        { teacher: { fullName: { contains: search } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.dailyTeachingLog.count({ where }),
      prisma.dailyTeachingLog.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              fullName: true,
              fullNameNepali: true,
              post: true,
              photoUrl: true,
              phone: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              section: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              nameNepali: true,
              code: true,
            },
          },
        },
        orderBy: [{ dateBs: 'desc' }, { periodNo: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('Error fetching teaching logs:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET SUMMARY STATS ────────────────────────────────────────────────────
// GET /api/daily-logs/summary?dateBs=
router.get('/summary', authenticate, async (req, res) => {
  try {
    const today = req.query.dateBs || getTodayBs();

    const [totalLogsToday, distinctTeachersToday, distinctClassesToday, totalClasses] = await Promise.all([
      prisma.dailyTeachingLog.count({ where: { dateBs: today } }),
      prisma.dailyTeachingLog.groupBy({
        by: ['teacherId'],
        where: { dateBs: today },
      }),
      prisma.dailyTeachingLog.groupBy({
        by: ['classId'],
        where: { dateBs: today },
      }),
      prisma.class.count(),
    ]);

    // Recent 5 logs today
    const recentLogs = await prisma.dailyTeachingLog.findMany({
      where: { dateBs: today },
      include: {
        teacher: { select: { fullName: true, post: true } },
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return res.json({
      success: true,
      data: {
        dateBs: today,
        totalLogsToday,
        activeTeachersTodayCount: distinctTeachersToday.length,
        classesCoveredTodayCount: distinctClassesToday.length,
        totalClassesCount: totalClasses,
        recentLogs,
      },
    });
  } catch (err) {
    console.error('Error fetching logs summary:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. CREATE DAILY TEACHING LOG ────────────────────────────────────────────
// POST /api/daily-logs
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      subjectName,
      dateBs,
      periodNo,
      topicTaught,
      learningOutcome,
      homework,
      teachingMethod,
      studentFeedback,
      status = 'COMPLETED',
      substituteTeacherName,
    } = req.body;

    let targetTeacherId = req.body.teacherId;

    if (req.user.role === 'TEACHER') {
      targetTeacherId = req.user.teacher?.id;
    }

    if (!targetTeacherId) {
      return res.status(400).json({ success: false, message: 'Teacher ID is required.' });
    }

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Class is required.' });
    }

    if (!topicTaught || !topicTaught.trim()) {
      return res.status(400).json({ success: false, message: 'Topic / Lesson description (पाठ विवरण) is required.' });
    }

    const logDateBs = dateBs && dateBs.trim() ? dateBs.trim() : getTodayBs();

    // Determine subject name if ID is provided
    let finalSubjectName = subjectName || null;
    if (subjectId && !finalSubjectName) {
      const sub = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
      if (sub) finalSubjectName = sub.name;
    }

    const newLog = await prisma.dailyTeachingLog.create({
      data: {
        teacherId: parseInt(targetTeacherId),
        classId: parseInt(classId),
        subjectId: subjectId ? parseInt(subjectId) : null,
        subjectName: finalSubjectName,
        dateBs: logDateBs,
        periodNo: periodNo ? parseInt(periodNo) : null,
        topicTaught: topicTaught.trim(),
        learningOutcome: learningOutcome?.trim() || null,
        homework: homework?.trim() || null,
        teachingMethod: teachingMethod?.trim() || null,
        studentFeedback: studentFeedback?.trim() || null,
        status,
        substituteTeacherName: substituteTeacherName?.trim() || null,
      },
      include: {
        teacher: { select: { id: true, fullName: true, post: true } },
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: newLog,
      message: 'Daily Teaching Log recorded successfully (दैनिक शिक्षण लग सुरक्षित भयो)!',
    });
  } catch (err) {
    console.error('Error creating teaching log:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. UPDATE DAILY TEACHING LOG ────────────────────────────────────────────
// PUT /api/daily-logs/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const existing = await prisma.dailyTeachingLog.findUnique({ where: { id: logId } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Teaching log not found.' });
    }

    // Only creator teacher or admin can edit
    if (req.user.role === 'TEACHER' && existing.teacherId !== req.user.teacher?.id) {
      return res.status(403).json({ success: false, message: 'Permission denied. You can only edit your own teaching logs.' });
    }

    const {
      classId,
      subjectId,
      subjectName,
      dateBs,
      periodNo,
      topicTaught,
      learningOutcome,
      homework,
      teachingMethod,
      studentFeedback,
      status,
      substituteTeacherName,
    } = req.body;

    const data = {};
    if (classId) data.classId = parseInt(classId);
    if (subjectId !== undefined) data.subjectId = subjectId ? parseInt(subjectId) : null;
    if (subjectName !== undefined) data.subjectName = subjectName;
    if (dateBs) data.dateBs = dateBs.trim();
    if (periodNo !== undefined) data.periodNo = periodNo ? parseInt(periodNo) : null;
    if (topicTaught) data.topicTaught = topicTaught.trim();
    if (learningOutcome !== undefined) data.learningOutcome = learningOutcome?.trim() || null;
    if (homework !== undefined) data.homework = homework?.trim() || null;
    if (teachingMethod !== undefined) data.teachingMethod = teachingMethod?.trim() || null;
    if (studentFeedback !== undefined) data.studentFeedback = studentFeedback?.trim() || null;
    if (status) data.status = status;
    if (substituteTeacherName !== undefined) data.substituteTeacherName = substituteTeacherName?.trim() || null;

    const updated = await prisma.dailyTeachingLog.update({
      where: { id: logId },
      data,
      include: {
        teacher: { select: { id: true, fullName: true, post: true } },
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Teaching log updated successfully (शिक्षण लग अद्यावधिक भयो)!',
    });
  } catch (err) {
    console.error('Error updating teaching log:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. DELETE DAILY TEACHING LOG ────────────────────────────────────────────
// DELETE /api/daily-logs/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const existing = await prisma.dailyTeachingLog.findUnique({ where: { id: logId } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Teaching log not found.' });
    }

    if (req.user.role === 'TEACHER' && existing.teacherId !== req.user.teacher?.id) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    await prisma.dailyTeachingLog.delete({ where: { id: logId } });

    return res.json({
      success: true,
      message: 'Teaching log deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting teaching log:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
