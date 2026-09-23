const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/routine — get routine with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, teacherId, academicYearId } = req.query;
    const where = {};
    if (classId) where.classId = parseInt(classId);
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (academicYearId) where.academicYearId = parseInt(academicYearId);

    const routines = await prisma.classRoutine.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
    });

    return res.json({ success: true, data: routines });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/routine/teacher/:teacherId — get specific teacher's master timetable
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    const { academicYearId } = req.query;
    const where = { teacherId };
    if (academicYearId) where.academicYearId = parseInt(academicYearId);

    const routines = await prisma.classRoutine.findMany({
      where,
      include: {
        class: true,
        subject: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
    });

    return res.json({ success: true, data: routines });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/routine/batch-save — save full weekly routine with conflict detection
router.post('/batch-save', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { classId, academicYearId, routines } = req.body;
    if (!classId || !academicYearId || !Array.isArray(routines)) {
      return res.status(400).json({ success: false, message: 'Class, Academic Year, and routine array are required.' });
    }

    const cId = parseInt(classId);
    const ayId = parseInt(academicYearId);

    // 1. Conflict Check: check if any assigned teacher is already booked in another class in the same day & period
    for (const r of routines) {
      if (!r.isBreak && r.teacherId) {
        const conflict = await prisma.classRoutine.findFirst({
          where: {
            academicYearId: ayId,
            dayOfWeek: parseInt(r.dayOfWeek),
            periodNo: parseInt(r.periodNo),
            teacherId: parseInt(r.teacherId),
            classId: { not: cId }, // different class
          },
          include: { class: true, teacher: true },
        });

        if (conflict) {
          const days = ['', 'आइतबार (Sunday)', 'सोमबार (Monday)', 'मंगलबार (Tuesday)', 'बुधबार (Wednesday)', 'बिहीबार (Thursday)', 'शुक्रबार (Friday)'];
          return res.status(400).json({
            success: false,
            message: `समय जुध्यो (Teacher Conflict): शिक्षक ${conflict.teacher?.fullName} ${days[r.dayOfWeek]} को घण्टी ${r.periodNo} मा पहिले नै ${conflict.class?.name} मा तोकिनुभएको छ।`,
          });
        }
      }
    }

    // 2. Clear existing routine for this class & academic year
    await prisma.classRoutine.deleteMany({
      where: { classId: cId, academicYearId: ayId },
    });

    // 3. Insert new routine entries
    const toInsert = routines
      .filter(r => (r.isBreak || r.subjectId || r.teacherId))
      .map(r => ({
        classId: cId,
        academicYearId: ayId,
        dayOfWeek: parseInt(r.dayOfWeek),
        periodNo: parseInt(r.periodNo),
        startTime: r.startTime || '',
        endTime: r.endTime || '',
        isBreak: Boolean(r.isBreak),
        breakTitle: r.isBreak ? (r.breakTitle || 'Tiffin Break') : null,
        subjectId: r.subjectId ? parseInt(r.subjectId) : null,
        teacherId: r.teacherId ? parseInt(r.teacherId) : null,
        roomNo: r.roomNo ? String(r.roomNo).trim() : null,
      }));

    if (toInsert.length > 0) {
      await prisma.classRoutine.createMany({ data: toInsert });
    }

    return res.json({ success: true, message: 'कक्षाको रुटिन (Class Routine) सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/routine/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.classRoutine.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'घण्टी तालिका सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
