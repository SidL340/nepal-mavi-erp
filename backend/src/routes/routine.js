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

// GET /api/routine/class/:classId — get specific class routine
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const routines = await prisma.classRoutine.findMany({
      where: { classId },
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

// GET /api/routine/master — get all routines across school for conflict checking
router.get('/master', authenticate, async (req, res) => {
  try {
    const routines = await prisma.classRoutine.findMany({
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

const DAY_NAME_TO_INT = {
  'SUNDAY': 1,
  'MONDAY': 2,
  'TUESDAY': 3,
  'WEDNESDAY': 4,
  'THURSDAY': 5,
  'FRIDAY': 6,
  'SATURDAY': 7,
};

const INT_TO_DAY_NAME = {
  1: 'SUNDAY',
  2: 'MONDAY',
  3: 'TUESDAY',
  4: 'WEDNESDAY',
  5: 'THURSDAY',
  6: 'FRIDAY',
  7: 'SATURDAY',
};

// Batch Save Handler (Handles both /batch and /batch-save)
async function handleBatchSave(req, res) {
  try {
    const classId = parseInt(req.body.classId);
    let routines = req.body.routines || req.body.entries;

    if (!classId || !Array.isArray(routines)) {
      return res.status(400).json({ success: false, message: 'Class ID and routine entries array are required.' });
    }

    let academicYearId = req.body.academicYearId ? parseInt(req.body.academicYearId) : null;
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      academicYearId = activeYear?.id || 1;
    }

    // 1. Conflict Check: check if any assigned teacher is already booked in another class in the same day & period
    for (const r of routines) {
      const teacherId = r.teacherId ? parseInt(r.teacherId) : null;
      if (!r.isBreak && teacherId) {
        const dayInt = typeof r.dayOfWeek === 'string' ? (DAY_NAME_TO_INT[r.dayOfWeek.toUpperCase()] || 1) : parseInt(r.dayOfWeek);
        const periodNum = parseInt(r.periodNo || r.periodNumber);

        const conflict = await prisma.classRoutine.findFirst({
          where: {
            academicYearId,
            dayOfWeek: dayInt,
            periodNo: periodNum,
            teacherId,
            classId: { not: classId },
          },
          include: { class: true, teacher: true },
        });

        if (conflict) {
          const daysNepali = ['', 'आइतबार (Sunday)', 'सोमबार (Monday)', 'मंगलबार (Tuesday)', 'बुधबार (Wednesday)', 'बिहीबार (Thursday)', 'शुक्रबार (Friday)', 'शनिबार (Saturday)'];
          return res.status(400).json({
            success: false,
            message: `समय जुध्यो (Teacher Conflict): शिक्षक ${conflict.teacher?.fullName || 'Teacher'} ${daysNepali[dayInt] || ''} को घण्टी ${periodNum} मा पहिले नै ${conflict.class?.name} मा तोकिनुभएको छ।`,
          });
        }
      }
    }

    // 2. Clear existing routine for this class & academic year
    await prisma.classRoutine.deleteMany({
      where: { classId, academicYearId },
    });

    // 3. Insert new routine entries
    const toInsert = routines
      .filter(r => (r.isBreak || r.subjectId || r.teacherId))
      .map(r => {
        const dayInt = typeof r.dayOfWeek === 'string' ? (DAY_NAME_TO_INT[r.dayOfWeek.toUpperCase()] || 1) : parseInt(r.dayOfWeek);
        const periodNum = parseInt(r.periodNo || r.periodNumber);
        return {
          classId,
          academicYearId,
          dayOfWeek: dayInt,
          periodNo: periodNum,
          startTime: r.startTime || '',
          endTime: r.endTime || '',
          isBreak: Boolean(r.isBreak),
          breakTitle: r.isBreak ? (r.breakTitle || 'Tiffin Break') : null,
          subjectId: r.subjectId ? parseInt(r.subjectId) : null,
          teacherId: r.teacherId ? parseInt(r.teacherId) : null,
          roomNo: r.roomNo ? String(r.roomNo).trim() : null,
        };
      });

    if (toInsert.length > 0) {
      await prisma.classRoutine.createMany({ data: toInsert });
    }

    return res.json({ success: true, message: 'कक्षाको रुटिन (Class Routine) सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}

router.post('/batch-save', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), handleBatchSave);
router.post('/batch', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), handleBatchSave);

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

