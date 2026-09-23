const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── EXAM ROOMS ─────────────────────────────────────────────────────────────

// GET /api/seat-plans/rooms — list exam rooms
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const rooms = await prisma.examRoom.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { seatPlans: true } },
      },
      orderBy: { roomNo: 'asc' },
    });
    return res.json({ success: true, data: rooms });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/seat-plans/rooms — create exam room
router.post('/rooms', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { roomNo, building, totalBenches, seatsPerBench } = req.body;
    if (!roomNo || !totalBenches) {
      return res.status(400).json({ success: false, message: 'Room No and total benches are required.' });
    }

    const benches = parseInt(totalBenches);
    const spb = parseInt(seatsPerBench) || 2;

    const room = await prisma.examRoom.create({
      data: {
        roomNo: String(roomNo).trim(),
        building: building ? String(building).trim() : null,
        totalBenches: benches,
        seatsPerBench: spb,
        totalCapacity: benches * spb,
      },
    });

    return res.status(201).json({ success: true, data: room, message: 'परीक्षा कोठा (Exam Room) सफलतापूर्वक थपियो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/seat-plans/rooms/:id
router.delete('/rooms/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.examSeatPlan.deleteMany({ where: { roomId: id } });
    await prisma.examRoom.delete({ where: { id } });
    return res.json({ success: true, message: 'परीक्षा कोठा सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── SMART AUTO SEAT PLANNING ─────────────────────────────────────────────────

// GET /api/seat-plans — get seat plan for an exam
router.get('/', authenticate, async (req, res) => {
  try {
    const { examId, roomId, classId } = req.query;
    const where = {};
    if (examId) where.examId = parseInt(examId);
    if (roomId) where.roomId = parseInt(roomId);
    if (classId) where.classId = parseInt(classId);

    const seatPlans = await prisma.examSeatPlan.findMany({
      where,
      include: {
        room: true,
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
        exam: true,
      },
      orderBy: [{ roomId: 'asc' }, { benchNo: 'asc' }, { seatPosition: 'asc' }],
    });

    return res.json({ success: true, data: seatPlans });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/seat-plans/auto-generate — intelligent anti-cheating seat allocator
router.post('/auto-generate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { examId, roomIds, classIds } = req.body;
    if (!examId || !Array.isArray(roomIds) || roomIds.length === 0 || !Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Exam, at least one Room, and at least one Class are required.' });
    }

    const exId = parseInt(examId);
    const parsedRoomIds = roomIds.map(id => parseInt(id));
    const parsedClassIds = classIds.map(id => parseInt(id));

    // 1. Fetch available rooms
    const rooms = await prisma.examRoom.findMany({
      where: { id: { in: parsedRoomIds }, isActive: true },
      orderBy: { roomNo: 'asc' },
    });

    if (rooms.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rooms selected.' });
    }

    // 2. Fetch all active students for selected classes grouped by class
    const studentsByClass = [];
    for (const cId of parsedClassIds) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: cId, isActive: true, student: { isActive: true } },
        include: { student: true, class: true },
        orderBy: [{ rollNo: 'asc' }, { student: { fullName: 'asc' } }],
      });
      if (enrollments.length > 0) {
        studentsByClass.push({
          classId: cId,
          className: enrollments[0].class?.name || `Class ${cId}`,
          students: enrollments.map(e => ({
            studentId: e.student.id,
            fullName: e.student.fullName,
            rollNo: e.rollNo,
            classId: cId,
            emisId: e.student.emisId || e.student.studentId,
          })),
        });
      }
    }

    const totalStudentsToSeat = studentsByClass.reduce((sum, c) => sum + c.students.length, 0);
    const totalRoomCapacity = rooms.reduce((sum, r) => sum + (r.totalBenches * (r.seatsPerBench || 2)), 0);

    if (totalRoomCapacity < totalStudentsToSeat) {
      return res.status(400).json({
        success: false,
        message: `कोठाको क्षमता अपुग छ (Insufficient Room Capacity)! कुल विद्यार्थी: ${totalStudentsToSeat}, तर छानिएका कोठाहरूको कुल सिट: ${totalRoomCapacity} मात्र छ। कृपया थप कोठा छनौट गर्नुहोस्।`,
      });
    }

    // 3. Clear existing seat plan for this exam and rooms
    await prisma.examSeatPlan.deleteMany({
      where: { examId: exId, roomId: { in: parsedRoomIds } },
    });

    // 4. Interleaving algorithm: alternate students from different classes across benches
    // Queue of students
    const classQueues = studentsByClass.map(c => [...c.students]);
    let currentClassQueueIndex = 0;

    function getNextStudent(avoidClassId = null) {
      // Try to find a student from a different class than avoidClassId
      let attempts = 0;
      while (attempts < classQueues.length) {
        const q = classQueues[currentClassQueueIndex];
        const clsId = studentsByClass[currentClassQueueIndex].classId;
        currentClassQueueIndex = (currentClassQueueIndex + 1) % classQueues.length;
        attempts++;

        if (q.length > 0 && (avoidClassId === null || clsId !== avoidClassId || classQueues.filter(x => x.length > 0).length === 1)) {
          return q.shift();
        }
      }
      // If no different class left, take whatever is available
      for (const q of classQueues) {
        if (q.length > 0) return q.shift();
      }
      return null;
    }

    const newSeatPlans = [];

    for (const room of rooms) {
      const spb = room.seatsPerBench || 2;
      for (let bench = 1; bench <= room.totalBenches; bench++) {
        let prevBenchClassId = null;

        // Position 1: LEFT
        const sLeft = getNextStudent(prevBenchClassId);
        if (sLeft) {
          prevBenchClassId = sLeft.classId;
          newSeatPlans.push({
            examId: exId,
            roomId: room.id,
            benchNo: bench,
            seatPosition: 'LEFT',
            studentId: sLeft.studentId,
            classId: sLeft.classId,
            rollNo: sLeft.rollNo,
            seatNo: `${room.roomNo}-B${bench}-L`,
          });
        }

        // Position 2: RIGHT (anti-cheat: avoid same class as sLeft)
        if (spb >= 2) {
          const sRight = getNextStudent(prevBenchClassId);
          if (sRight) {
            newSeatPlans.push({
              examId: exId,
              roomId: room.id,
              benchNo: bench,
              seatPosition: 'RIGHT',
              studentId: sRight.studentId,
              classId: sRight.classId,
              rollNo: sRight.rollNo,
              seatNo: `${room.roomNo}-B${bench}-R`,
            });
          }
        }
      }
    }

    if (newSeatPlans.length > 0) {
      await prisma.examSeatPlan.createMany({ data: newSeatPlans });
    }

    return res.json({
      success: true,
      message: `सिट प्लानिङ (Seat Planning) सफलतापूर्वक तयार भयो! कुल ${newSeatPlans.length} जना विद्यार्थीहरूलाई ${rooms.length} वटा कोठामा व्यवस्थित गरियो।`,
      data: { totalSeated: newSeatPlans.length },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/seat-plans/exam/:examId — clear seat plans for an exam
router.delete('/exam/:examId', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.examSeatPlan.deleteMany({ where: { examId: parseInt(req.params.examId) } });
    return res.json({ success: true, message: 'सिट प्लानिङ सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
