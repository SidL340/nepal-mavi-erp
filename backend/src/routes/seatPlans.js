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

// GET /api/seat-plans/students-eligibility — fetch student attendance percentage & eligibility
router.get('/students-eligibility', authenticate, async (req, res) => {
  try {
    const { classIds, examId } = req.query;
    if (!classIds) {
      return res.status(400).json({ success: false, message: 'Class IDs are required.' });
    }

    const parsedClassIds = String(classIds).split(',').map(id => parseInt(id.trim())).filter(Boolean);
    if (parsedClassIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: { in: parsedClassIds }, isActive: true, student: { isActive: true } },
      include: {
        student: {
          include: {
            attendances: {
              select: { status: true },
            },
          },
        },
        class: true,
      },
      orderBy: [{ classId: 'asc' }, { rollNo: 'asc' }, { student: { fullName: 'asc' } }],
    });

    const result = enrollments.map(e => {
      const totalAtt = e.student.attendances?.length || 0;
      const presentCount = e.student.attendances?.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length || 0;
      const attendancePct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

      return {
        studentId: e.student.id,
        fullName: e.student.fullName,
        emisId: e.student.emisId || e.student.studentId,
        rollNo: e.rollNo,
        classId: e.classId,
        className: e.class?.name || `Class ${e.classId}`,
        totalDays: totalAtt,
        presentDays: presentCount,
        attendancePct,
        isLowAttendance: attendancePct < 75,
        status: e.student.status || 'ACTIVE',
      };
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

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
    const { examId, roomIds, classIds, shift, excludedStudentIds } = req.body;
    if (!examId || !Array.isArray(roomIds) || roomIds.length === 0 || !Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Exam, at least one Room, and at least one Class are required.' });
    }

    const exId = parseInt(examId);
    const shiftName = shift ? String(shift).trim() : 'DAY';
    const parsedRoomIds = roomIds.map(id => parseInt(id));
    const parsedClassIds = classIds.map(id => parseInt(id));
    const excludedIdsSet = new Set(Array.isArray(excludedStudentIds) ? excludedStudentIds.map(Number) : []);

    // 1. Fetch available rooms
    const rooms = await prisma.examRoom.findMany({
      where: { id: { in: parsedRoomIds }, isActive: true },
      orderBy: { roomNo: 'asc' },
    });

    if (rooms.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rooms selected.' });
    }

    // 2. Fetch all active students for selected classes, excluding any unselected/low-attendance students
    const studentsByClass = [];
    for (const cId of parsedClassIds) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: cId, isActive: true, student: { isActive: true } },
        include: { student: true, class: true },
        orderBy: [{ rollNo: 'asc' }, { student: { fullName: 'asc' } }],
      });

      const eligibleStudents = enrollments
        .filter(e => !excludedIdsSet.has(e.student.id))
        .map(e => ({
          studentId: e.student.id,
          fullName: e.student.fullName,
          rollNo: e.rollNo,
          classId: cId,
          emisId: e.student.emisId || e.student.studentId,
        }));

      if (eligibleStudents.length > 0) {
        studentsByClass.push({
          classId: cId,
          className: enrollments[0]?.class?.name || `Class ${cId}`,
          students: eligibleStudents,
        });
      }
    }

    const totalStudentsToSeat = studentsByClass.reduce((sum, c) => sum + c.students.length, 0);
    const totalRoomCapacity = rooms.reduce((sum, r) => sum + (r.totalBenches * Math.max(1, r.seatsPerBench || 2)), 0);

    if (totalStudentsToSeat === 0) {
      return res.status(400).json({
        success: false,
        message: 'छानिएका कक्षाहरूमा सिट प्लानका लागि कुनै पनि योग्य विद्यार्थी उपलब्ध छैनन् (वा सबै विद्यार्थीहरू बहिष्कृत छन्)।',
      });
    }

    if (totalRoomCapacity < totalStudentsToSeat) {
      return res.status(400).json({
        success: false,
        message: `कोठाको क्षमता अपुग छ (Insufficient Room Capacity)! कुल योग्य विद्यार्थी: ${totalStudentsToSeat}, तर छानिएका कोठाहरूको कुल सिट: ${totalRoomCapacity} मात्र छ। कृपया थप कोठा छनौट गर्नुहोस्।`,
      });
    }

    // 3. Clear existing seat plan for this exam, shift, and rooms
    await prisma.examSeatPlan.deleteMany({
      where: { examId: exId, shift: shiftName, roomId: { in: parsedRoomIds } },
    });

    // 4. Stricter anti-cheating interleaving:
    // When multiple seats are on the same bench (e.g. 2, 3, 4 seats), NO two students on the same bench should share the same class.
    const classQueues = studentsByClass.map(c => [...c.students]);
    let currentClassQueueIndex = 0;

    function getNextStudent(avoidClassIds = []) {
      const activeQueues = classQueues.filter(q => q.length > 0);
      if (activeQueues.length === 0) return null;

      // Try finding a class queue NOT in avoidClassIds
      for (let attempt = 0; attempt < classQueues.length; attempt++) {
        const idx = (currentClassQueueIndex + attempt) % classQueues.length;
        const q = classQueues[idx];
        const clsId = studentsByClass[idx].classId;

        if (q.length > 0 && (!avoidClassIds.includes(clsId) || activeQueues.length <= avoidClassIds.length)) {
          currentClassQueueIndex = (idx + 1) % classQueues.length;
          return q.shift();
        }
      }

      // Fallback: pick from any remaining queue
      for (let attempt = 0; attempt < classQueues.length; attempt++) {
        const idx = (currentClassQueueIndex + attempt) % classQueues.length;
        const q = classQueues[idx];
        if (q.length > 0) {
          currentClassQueueIndex = (idx + 1) % classQueues.length;
          return q.shift();
        }
      }
      return null;
    }

    const newSeatPlans = [];

    for (const room of rooms) {
      const spb = Math.max(1, parseInt(room.seatsPerBench) || 2);
      let roomSeatCounter = 1;

      for (let bench = 1; bench <= room.totalBenches; bench++) {
        const benchUsedClassIds = [];

        for (let posIdx = 1; posIdx <= spb; posIdx++) {
          const student = getNextStudent(benchUsedClassIds);
          if (!student) break;

          benchUsedClassIds.push(student.classId);

          let positionLabel = `SEAT-${posIdx}`;
          let posCode = `P${posIdx}`;

          if (spb === 1) {
            positionLabel = 'SINGLE';
            posCode = 'S';
          } else if (spb === 2) {
            positionLabel = posIdx === 1 ? 'LEFT' : 'RIGHT';
            posCode = posIdx === 1 ? 'L' : 'R';
          } else if (spb === 3) {
            positionLabel = posIdx === 1 ? 'LEFT' : posIdx === 2 ? 'MIDDLE' : 'RIGHT';
            posCode = posIdx === 1 ? 'L' : posIdx === 2 ? 'M' : 'R';
          } else if (spb === 4) {
            positionLabel = posIdx === 1 ? 'LEFT' : posIdx === 2 ? 'MID-L' : posIdx === 3 ? 'MID-R' : 'RIGHT';
            posCode = posIdx === 1 ? 'L' : posIdx === 2 ? 'ML' : posIdx === 3 ? 'MR' : 'R';
          } else {
            positionLabel = posIdx === 1 ? 'LEFT' : posIdx === spb ? 'RIGHT' : `SEAT-${posIdx}`;
            posCode = `S${posIdx}`;
          }

          const formattedSeatNo = `Seat ${String(roomSeatCounter).padStart(2, '0')}`;

          newSeatPlans.push({
            examId: exId,
            shift: shiftName,
            roomId: room.id,
            benchNo: bench,
            seatPosition: positionLabel,
            studentId: student.studentId,
            classId: student.classId,
            rollNo: student.rollNo,
            seatNo: formattedSeatNo,
          });

          roomSeatCounter++;
        }
      }
    }

    if (newSeatPlans.length > 0) {
      await prisma.examSeatPlan.createMany({ data: newSeatPlans });
    }

    return res.json({
      success: true,
      message: `सिट प्लानिङ [${shiftName}] सफलतापूर्वक तयार भयो! कुल ${newSeatPlans.length} जना विद्यार्थीहरूलाई ${rooms.length} वटा कोठामा सिट नं. (Seat 01, 02...) सहित व्यवस्थित गरियो। (बहिष्कृत: ${excludedIdsSet.size} जना)`,
      data: { totalSeated: newSeatPlans.length, excludedCount: excludedIdsSet.size, shift: shiftName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/seat-plans/allot-student — manual or late-arriving student seat allotment
router.post('/allot-student', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const { examId, shift, studentId, roomId, benchNo, seatPosition } = req.body;
    if (!examId || !studentId) {
      return res.status(400).json({ success: false, message: 'Exam and Student are required.' });
    }

    const exId = parseInt(examId);
    const sId = parseInt(studentId);
    const shiftName = shift ? String(shift).trim() : 'DAY';

    // Get student enrollment info
    const student = await prisma.student.findUnique({
      where: { id: sId },
      include: {
        classEnrollment: { where: { isActive: true }, include: { class: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const classId = student.classEnrollment?.[0]?.classId || 0;
    const rollNo = student.classEnrollment?.[0]?.rollNo || null;

    let targetRoomId = roomId ? parseInt(roomId) : null;
    let targetBenchNo = benchNo ? parseInt(benchNo) : null;
    let targetPosition = seatPosition ? String(seatPosition).trim() : null;

    // If specific room/bench/seat not provided, find first available empty seat slot
    if (!targetRoomId || !targetBenchNo || !targetPosition) {
      const activeRooms = await prisma.examRoom.findMany({
        where: { isActive: true },
        orderBy: { roomNo: 'asc' },
      });

      const existingSeats = await prisma.examSeatPlan.findMany({
        where: { examId: exId, shift: shiftName },
      });

      const seatSet = new Set(existingSeats.map(s => `${s.roomId}-B${s.benchNo}-${s.seatPosition}`));

      for (const r of activeRooms) {
        const spb = Math.max(1, r.seatsPerBench || 2);
        for (let b = 1; b <= r.totalBenches; b++) {
          for (let p = 1; p <= spb; p++) {
            let posLabel = `SEAT-${p}`;
            if (spb === 1) posLabel = 'SINGLE';
            else if (spb === 2) posLabel = p === 1 ? 'LEFT' : 'RIGHT';
            else if (spb === 3) posLabel = p === 1 ? 'LEFT' : p === 2 ? 'MIDDLE' : 'RIGHT';
            else if (spb === 4) posLabel = p === 1 ? 'LEFT' : p === 2 ? 'MID-L' : p === 3 ? 'MID-R' : 'RIGHT';

            const key = `${r.id}-B${b}-${posLabel}`;
            if (!seatSet.has(key)) {
              targetRoomId = r.id;
              targetBenchNo = b;
              targetPosition = posLabel;
              break;
            }
          }
          if (targetRoomId) break;
        }
        if (targetRoomId) break;
      }
    }

    if (!targetRoomId || !targetBenchNo || !targetPosition) {
      return res.status(400).json({
        success: false,
        message: 'कोठामा कुनै पनि खाली सिट उपलब्ध छैन (No empty seat available). कृपया नयाँ कोठा वा थप बेन्च थप्नुहोस्।',
      });
    }

    const room = await prisma.examRoom.findUnique({ where: { id: targetRoomId } });
    const spb = Math.max(1, room?.seatsPerBench || 2);
    let pOffset = 1;
    if (targetPosition === 'RIGHT' && spb === 2) pOffset = 2;
    else if (targetPosition === 'MID-L') pOffset = 2;
    else if (targetPosition === 'MIDDLE') pOffset = 2;
    else if (targetPosition === 'MID-R') pOffset = 3;
    else if (targetPosition === 'RIGHT' && spb > 2) pOffset = spb;
    else if (targetPosition?.startsWith('SEAT-')) pOffset = parseInt(targetPosition.replace('SEAT-', '')) || 1;

    const seatSeq = (targetBenchNo - 1) * spb + pOffset;
    const seatNo = `Seat ${String(seatSeq).padStart(2, '0')}`;

    // Remove any previous seat assignment for this student in this exam/shift
    await prisma.examSeatPlan.deleteMany({
      where: { examId: exId, shift: shiftName, studentId: sId },
    });

    // Assign seat
    const assigned = await prisma.examSeatPlan.create({
      data: {
        examId: exId,
        shift: shiftName,
        roomId: targetRoomId,
        benchNo: targetBenchNo,
        seatPosition: targetPosition,
        studentId: sId,
        classId,
        rollNo,
        seatNo,
      },
      include: {
        room: true,
        student: {
          include: { classEnrollment: { where: { isActive: true }, include: { class: true } } },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: assigned,
      message: `${student.fullName} लाई ${room?.roomNo}, Bench #${targetBenchNo} (${targetPosition}) मा सफलतापूर्वक सिट तोकियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/seat-plans/seat/:id — remove a single seat plan entry
router.delete('/seat/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const seatId = parseInt(req.params.id);
    await prisma.examSeatPlan.delete({ where: { id: seatId } });
    return res.json({ success: true, message: 'सिट आवंटन हटाइयो!' });
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

