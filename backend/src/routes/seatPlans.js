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
router.post('/rooms', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
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

// POST /api/seat-plans/rooms/seed-default — auto-create standard examination rooms
router.post('/rooms/seed-default', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const existing = await prisma.examRoom.findMany();
    const existingNames = new Set(existing.map(r => r.roomNo));

    const defaultRooms = [
      { roomNo: 'Room 101', building: 'Main Building', totalBenches: 15, seatsPerBench: 2 },
      { roomNo: 'Room 102', building: 'Main Building', totalBenches: 15, seatsPerBench: 2 },
      { roomNo: 'Room 103', building: 'Main Building', totalBenches: 15, seatsPerBench: 2 },
      { roomNo: 'Room 201', building: 'Secondary Wing', totalBenches: 18, seatsPerBench: 2 },
      { roomNo: 'Room 202', building: 'Secondary Wing', totalBenches: 18, seatsPerBench: 2 },
      { roomNo: 'Main Exam Hall', building: 'Auditorium Block', totalBenches: 30, seatsPerBench: 2 },
    ];

    const toCreate = defaultRooms
      .filter(r => !existingNames.has(r.roomNo))
      .map(r => ({
        ...r,
        totalCapacity: r.totalBenches * r.seatsPerBench,
      }));

    if (toCreate.length > 0) {
      await prisma.examRoom.createMany({ data: toCreate });
    }

    const allRooms = await prisma.examRoom.findMany({
      where: { isActive: true },
      orderBy: { roomNo: 'asc' },
    });

    return res.status(201).json({
      success: true,
      data: allRooms,
      message: `${toCreate.length} वटा मानक परीक्षा कोठाहरू स्वतः थपिए!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/seat-plans/rooms/:id — update exam room
router.put('/rooms/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { roomNo, building, totalBenches, seatsPerBench } = req.body;
    if (!roomNo || !totalBenches) {
      return res.status(400).json({ success: false, message: 'Room No and total benches are required.' });
    }

    const benches = parseInt(totalBenches);
    const spb = parseInt(seatsPerBench) || 2;

    const updated = await prisma.examRoom.update({
      where: { id: roomId },
      data: {
        roomNo: String(roomNo).trim(),
        building: building ? String(building).trim() : null,
        totalBenches: benches,
        seatsPerBench: spb,
        totalCapacity: benches * spb,
      },
    });

    return res.json({ success: true, data: updated, message: 'परीक्षा कोठा विवरण सफलतापूर्वक परिमार्जन गरियो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/seat-plans/rooms/:id — delete exam room
router.delete('/rooms/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    await prisma.examSeatPlan.deleteMany({ where: { roomId } });
    await prisma.examRoom.delete({ where: { id: roomId } });
    return res.json({ success: true, message: 'परीक्षा कोठा सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── SMART AUTO SEAT PLANNING (SHIFT-WISE) ───────────────────────────────────

// GET /api/seat-plans — get seat plan for an exam & shift
router.get('/', authenticate, async (req, res) => {
  try {
    const { examId, roomId, classId, studentId, shift } = req.query;
    const where = {};
    if (examId) where.examId = parseInt(examId);
    if (roomId) where.roomId = parseInt(roomId);
    if (classId) where.classId = parseInt(classId);
    if (studentId) where.studentId = parseInt(studentId);
    if (shift) where.shift = String(shift);

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

// POST /api/seat-plans/auto-generate — intelligent anti-cheating seat allocator for chosen shift
router.post('/auto-generate', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const { examId, roomIds, classIds, shift } = req.body;
    if (!examId || !Array.isArray(roomIds) || roomIds.length === 0 || !Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Exam, at least one Room, and at least one Class are required.' });
    }

    const exId = parseInt(examId);
    const shiftName = shift ? String(shift).trim() : 'DAY';
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

    // 3. Clear existing seat plan for this exam, shift, and rooms
    await prisma.examSeatPlan.deleteMany({
      where: { examId: exId, shift: shiftName, roomId: { in: parsedRoomIds } },
    });

    // 4. Interleaving algorithm: alternate students from different classes across benches
    const classQueues = studentsByClass.map(c => [...c.students]);
    let currentClassQueueIndex = 0;

    function getNextStudent(avoidClassId = null) {
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
            shift: shiftName,
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
              shift: shiftName,
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
      message: `सिट प्लानिङ [${shiftName}] सफलतापूर्वक तयार भयो! कुल ${newSeatPlans.length} जना विद्यार्थीहरूलाई ${rooms.length} वटा कोठामा व्यवस्थित गरियो।`,
      data: { totalSeated: newSeatPlans.length, shift: shiftName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/seat-plans/exam/:examId — clear seat plans for an exam (optionally for a shift)
router.delete('/exam/:examId', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const { shift } = req.query;
    const where = { examId: parseInt(req.params.examId) };
    if (shift) where.shift = String(shift);

    await prisma.examSeatPlan.deleteMany({ where });
    return res.json({ success: true, message: `सिट प्लानिङ ${shift ? `[${shift}] ` : ''}सफलतापूर्वक हटाइयो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;

