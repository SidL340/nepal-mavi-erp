const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to parse room layout config (columns, separate left & right benches and seats per desk)
function parseRoomLayout(room) {
  let layoutConfig = {
    columnLayout: '2_COLUMNS',
    leftBenches: Math.ceil((room.totalBenches || 16) / 2),
    leftSeatsPerBench: room.seatsPerBench || 2,
    rightBenches: (room.totalBenches || 16) - Math.ceil((room.totalBenches || 16) / 2),
    rightSeatsPerBench: room.seatsPerBench || 2,
    middleBenches: 0,
    middleSeatsPerBench: 2,
  };
  let cleanBuilding = room.building || 'Main Block';

  if (room.building && room.building.includes(' | {')) {
    const parts = room.building.split(' | ');
    cleanBuilding = parts[0];
    try {
      const parsed = JSON.parse(parts.slice(1).join(' | '));
      layoutConfig = {
        columnLayout: parsed.columnLayout || '2_COLUMNS',
        leftBenches: parseInt(parsed.leftBenches) || Math.ceil((room.totalBenches || 16) / 2),
        leftSeatsPerBench: parseInt(parsed.leftSeatsPerBench) || room.seatsPerBench || 2,
        rightBenches: parseInt(parsed.rightBenches) || ((room.totalBenches || 16) - Math.ceil((room.totalBenches || 16) / 2)),
        rightSeatsPerBench: parseInt(parsed.rightSeatsPerBench) || room.seatsPerBench || 2,
        middleBenches: parseInt(parsed.middleBenches) || 0,
        middleSeatsPerBench: parseInt(parsed.middleSeatsPerBench) || 2,
      };
    } catch (e) {}
  }

  const leftCap = layoutConfig.leftBenches * layoutConfig.leftSeatsPerBench;
  const rightCap = layoutConfig.rightBenches * layoutConfig.rightSeatsPerBench;
  const middleCap = layoutConfig.middleBenches * layoutConfig.middleSeatsPerBench;
  const totalCap = leftCap + rightCap + middleCap || (room.totalBenches * (room.seatsPerBench || 2));
  const totalBenches = layoutConfig.leftBenches + layoutConfig.rightBenches + layoutConfig.middleBenches || room.totalBenches;

  return {
    ...room,
    building: cleanBuilding,
    layoutConfig,
    totalBenches,
    totalCapacity: totalCap,
  };
}

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
    const parsedRooms = rooms.map(parseRoomLayout);
    return res.json({ success: true, data: parsedRooms });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/seat-plans/rooms — create exam room with separate left & right desk setups
router.post('/rooms', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const {
      roomNo,
      building,
      columnLayout,
      leftBenches,
      leftSeatsPerBench,
      rightBenches,
      rightSeatsPerBench,
      middleBenches,
      middleSeatsPerBench,
      totalBenches,
      seatsPerBench,
    } = req.body;

    if (!roomNo || (!totalBenches && !leftBenches && !rightBenches)) {
      return res.status(400).json({ success: false, message: 'Room No and bench details are required.' });
    }

    const lBenches = parseInt(leftBenches) || 0;
    const lSpb = parseInt(leftSeatsPerBench) || parseInt(seatsPerBench) || 2;
    const rBenches = parseInt(rightBenches) || 0;
    const rSpb = parseInt(rightSeatsPerBench) || parseInt(seatsPerBench) || 2;
    const mBenches = columnLayout === '3_COLUMNS' ? (parseInt(middleBenches) || 0) : 0;
    const mSpb = parseInt(middleSeatsPerBench) || parseInt(seatsPerBench) || 2;

    const computedTotalBenches = (lBenches + rBenches + mBenches) || parseInt(totalBenches) || 16;
    const computedTotalCapacity = (lBenches * lSpb) + (rBenches * rSpb) + (mBenches * mSpb) || (computedTotalBenches * 2);
    const maxSpb = Math.max(lSpb, rSpb, mSpb, parseInt(seatsPerBench) || 2);

    const baseBuilding = building ? String(building).split(' | ')[0].trim() : 'Main Block';
    const layoutMeta = JSON.stringify({
      columnLayout: columnLayout || (mBenches > 0 ? '3_COLUMNS' : '2_COLUMNS'),
      leftBenches: lBenches || Math.ceil(computedTotalBenches / 2),
      leftSeatsPerBench: lSpb,
      rightBenches: rBenches || (computedTotalBenches - Math.ceil(computedTotalBenches / 2)),
      rightSeatsPerBench: rSpb,
      middleBenches: mBenches,
      middleSeatsPerBench: mSpb,
    });

    const buildingString = `${baseBuilding} | ${layoutMeta}`;

    const room = await prisma.examRoom.create({
      data: {
        roomNo: String(roomNo).trim(),
        building: buildingString,
        totalBenches: computedTotalBenches,
        seatsPerBench: maxSpb,
        totalCapacity: computedTotalCapacity,
      },
    });

    return res.status(201).json({ success: true, data: parseRoomLayout(room), message: 'परीक्षा कोठा (Exam Room) सफलतापूर्वक थपियो!' });
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
      {
        roomNo: 'Room 101',
        building: `Main Building | ${JSON.stringify({ columnLayout: '2_COLUMNS', leftBenches: 8, leftSeatsPerBench: 2, rightBenches: 7, rightSeatsPerBench: 2, middleBenches: 0, middleSeatsPerBench: 2 })}`,
        totalBenches: 15,
        seatsPerBench: 2,
        totalCapacity: 30,
      },
      {
        roomNo: 'Room 102',
        building: `Main Building | ${JSON.stringify({ columnLayout: '2_COLUMNS', leftBenches: 8, leftSeatsPerBench: 2, rightBenches: 7, rightSeatsPerBench: 2, middleBenches: 0, middleSeatsPerBench: 2 })}`,
        totalBenches: 15,
        seatsPerBench: 2,
        totalCapacity: 30,
      },
      {
        roomNo: 'Room 201',
        building: `Secondary Wing | ${JSON.stringify({ columnLayout: '2_COLUMNS', leftBenches: 9, leftSeatsPerBench: 2, rightBenches: 9, rightSeatsPerBench: 2, middleBenches: 0, middleSeatsPerBench: 2 })}`,
        totalBenches: 18,
        seatsPerBench: 2,
        totalCapacity: 36,
      },
      {
        roomNo: 'Main Exam Hall',
        building: `Auditorium Block | ${JSON.stringify({ columnLayout: '3_COLUMNS', leftBenches: 10, leftSeatsPerBench: 2, rightBenches: 10, rightSeatsPerBench: 2, middleBenches: 10, middleSeatsPerBench: 2 })}`,
        totalBenches: 30,
        seatsPerBench: 2,
        totalCapacity: 60,
      },
    ];

    const toCreate = defaultRooms.filter(r => !existingNames.has(r.roomNo));

    if (toCreate.length > 0) {
      await prisma.examRoom.createMany({ data: toCreate });
    }

    const allRooms = await prisma.examRoom.findMany({
      where: { isActive: true },
      orderBy: { roomNo: 'asc' },
    });

    return res.status(201).json({
      success: true,
      data: allRooms.map(parseRoomLayout),
      message: `${toCreate.length} वटा मानक परीक्षा कोठाहरू स्वतः थपिए!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/seat-plans/rooms/:id — update exam room with separate left & right desk setups
router.put('/rooms/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EXAM_INCHARGE'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const {
      roomNo,
      building,
      columnLayout,
      leftBenches,
      leftSeatsPerBench,
      rightBenches,
      rightSeatsPerBench,
      middleBenches,
      middleSeatsPerBench,
      totalBenches,
      seatsPerBench,
    } = req.body;

    if (!roomNo) {
      return res.status(400).json({ success: false, message: 'Room No is required.' });
    }

    const lBenches = parseInt(leftBenches) || 0;
    const lSpb = parseInt(leftSeatsPerBench) || parseInt(seatsPerBench) || 2;
    const rBenches = parseInt(rightBenches) || 0;
    const rSpb = parseInt(rightSeatsPerBench) || parseInt(seatsPerBench) || 2;
    const mBenches = columnLayout === '3_COLUMNS' ? (parseInt(middleBenches) || 0) : 0;
    const mSpb = parseInt(middleSeatsPerBench) || parseInt(seatsPerBench) || 2;

    const computedTotalBenches = (lBenches + rBenches + mBenches) || parseInt(totalBenches) || 16;
    const computedTotalCapacity = (lBenches * lSpb) + (rBenches * rSpb) + (mBenches * mSpb) || (computedTotalBenches * 2);
    const maxSpb = Math.max(lSpb, rSpb, mSpb, parseInt(seatsPerBench) || 2);

    const baseBuilding = building ? String(building).split(' | ')[0].trim() : 'Main Block';
    const layoutMeta = JSON.stringify({
      columnLayout: columnLayout || (mBenches > 0 ? '3_COLUMNS' : '2_COLUMNS'),
      leftBenches: lBenches || Math.ceil(computedTotalBenches / 2),
      leftSeatsPerBench: lSpb,
      rightBenches: rBenches || (computedTotalBenches - Math.ceil(computedTotalBenches / 2)),
      rightSeatsPerBench: rSpb,
      middleBenches: mBenches,
      middleSeatsPerBench: mSpb,
    });

    const buildingString = `${baseBuilding} | ${layoutMeta}`;

    const updated = await prisma.examRoom.update({
      where: { id: roomId },
      data: {
        roomNo: String(roomNo).trim(),
        building: buildingString,
        totalBenches: computedTotalBenches,
        seatsPerBench: maxSpb,
        totalCapacity: computedTotalCapacity,
      },
    });

    return res.json({ success: true, data: parseRoomLayout(updated), message: 'परीक्षा कोठा विवरण सफलतापूर्वक परिमार्जन गरियो!' });
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

    // 1. Fetch available rooms and parse their column layout configurations
    const rawRooms = await prisma.examRoom.findMany({
      where: { id: { in: parsedRoomIds }, isActive: true },
      orderBy: { roomNo: 'asc' },
    });

    if (rawRooms.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rooms selected.' });
    }

    const rooms = rawRooms.map(parseRoomLayout);

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
    const totalRoomCapacity = rooms.reduce((sum, r) => sum + r.totalCapacity, 0);

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

    // 4. Anti-cheating Column-Track Interleaving Allocator:
    // Rules:
    // a. Left-Right adjacent seats on a bench MUST NOT share the same class.
    // b. Diagonal adjacent seats (Row r Col c vs Row r+1 Col c±1) MUST NOT share the same class.
    // c. Front-to-Back (Row r Col c vs Row r+1 Col c) IS the same class, with students advancing in ascending roll sequence.
    // d. Supports independent Left vs Right vs Middle seats-per-desk settings.

    // Queues per class
    const classMap = new Map();
    studentsByClass.forEach(c => {
      classMap.set(c.classId, [...c.students]);
    });

    // Helper to get next student from a specific class
    function getStudentFromClass(cId) {
      const q = classMap.get(cId);
      if (q && q.length > 0) {
        return q.shift();
      }
      return null;
    }

    // Helper to get next available student avoiding specified class IDs
    let roundRobinIdx = 0;
    function getNextStudentAvoiding(avoidClassIds = []) {
      const classIdList = studentsByClass.map(c => c.classId);
      if (classIdList.length === 0) return null;

      // 1. Try finding a class not in avoidClassIds
      for (let i = 0; i < classIdList.length; i++) {
        const idx = (roundRobinIdx + i) % classIdList.length;
        const cId = classIdList[idx];
        const q = classMap.get(cId);
        if (q && q.length > 0 && !avoidClassIds.includes(cId)) {
          roundRobinIdx = (idx + 1) % classIdList.length;
          return q.shift();
        }
      }

      // 2. Fallback: take from any class with remaining students
      for (let i = 0; i < classIdList.length; i++) {
        const idx = (roundRobinIdx + i) % classIdList.length;
        const cId = classIdList[idx];
        const q = classMap.get(cId);
        if (q && q.length > 0) {
          roundRobinIdx = (idx + 1) % classIdList.length;
          return q.shift();
        }
      }

      return null;
    }

    function hasRemainingStudents() {
      for (const q of classMap.values()) {
        if (q.length > 0) return true;
      }
      return false;
    }

    function getForbiddenClasses(matrix, r, c, spb, numRows) {
      const forbidden = new Set();
      
      // 1. Horizontal neighbors on same bench (Left and Right)
      if (c > 0 && matrix[r][c - 1]) {
        forbidden.add(matrix[r][c - 1].classId);
      }
      if (c < spb - 1 && matrix[r][c + 1]) {
        forbidden.add(matrix[r][c + 1].classId);
      }

      // 2. Diagonals:
      // Top-Left Diagonal
      if (r > 0 && c > 0 && matrix[r - 1][c - 1]) {
        forbidden.add(matrix[r - 1][c - 1].classId);
      }
      // Top-Right Diagonal
      if (r > 0 && c < spb - 1 && matrix[r - 1][c + 1]) {
        forbidden.add(matrix[r - 1][c + 1].classId);
      }
      // Bottom-Left Diagonal (if already filled)
      if (r < numRows - 1 && c > 0 && matrix[r + 1][c - 1]) {
        forbidden.add(matrix[r + 1][c - 1].classId);
      }
      // Bottom-Right Diagonal (if already filled)
      if (r < numRows - 1 && c < spb - 1 && matrix[r + 1][c + 1]) {
        forbidden.add(matrix[r + 1][c + 1].classId);
      }

      return Array.from(forbidden);
    }

    const newSeatPlans = [];
    let lastAssignedClassIdAcrossRooms = null;

    for (const room of rooms) {
      if (!hasRemainingStudents()) break;

      const { layoutConfig } = room;
      let roomSeatCounter = 1;
      let globalBenchNumber = 1;

      // Build physical columns in this room
      const roomColumns = [];
      if (layoutConfig.leftBenches > 0) {
        roomColumns.push({
          colType: 'LEFT',
          benchesCount: layoutConfig.leftBenches,
          seatsPerBench: layoutConfig.leftSeatsPerBench || 2,
        });
      }
      if (layoutConfig.columnLayout === '3_COLUMNS' && layoutConfig.middleBenches > 0) {
        roomColumns.push({
          colType: 'MIDDLE',
          benchesCount: layoutConfig.middleBenches,
          seatsPerBench: layoutConfig.middleSeatsPerBench || 2,
        });
      }
      if (layoutConfig.rightBenches > 0) {
        roomColumns.push({
          colType: 'RIGHT',
          benchesCount: layoutConfig.rightBenches,
          seatsPerBench: layoutConfig.rightSeatsPerBench || 2,
        });
      }

      for (const col of roomColumns) {
        if (!hasRemainingStudents()) break;

        const numRows = col.benchesCount;
        const spb = col.seatsPerBench;

        // Matrix [rowIdx][posIdx] for this desk column
        const colMatrix = Array.from({ length: numRows }, () => Array(spb).fill(null));

        for (let posIdx = 0; posIdx < spb; posIdx++) {
          if (!hasRemainingStudents()) break;

          // Fill this vertical track from Row 0 to Row numRows-1 (Front to Back in sequential roll order)
          for (let rIdx = 0; rIdx < numRows; rIdx++) {
            if (!hasRemainingStudents()) break;

            const forbidden = getForbiddenClasses(colMatrix, rIdx, posIdx, spb, numRows);
            if (posIdx === 0 && rIdx === 0 && lastAssignedClassIdAcrossRooms && studentsByClass.length > 1) {
              if (!forbidden.includes(lastAssignedClassIdAcrossRooms)) {
                forbidden.push(lastAssignedClassIdAcrossRooms);
              }
            }

            let student = null;
            const preferredClassId = rIdx > 0 && colMatrix[rIdx - 1][posIdx] ? colMatrix[rIdx - 1][posIdx].classId : null;

            // If same class has more students AND is not forbidden by diagonal/horizontal neighbors, continue the track with next roll number!
            if (preferredClassId && !forbidden.includes(preferredClassId)) {
              student = getStudentFromClass(preferredClassId);
            }

            // If preferred class cannot be used or has no more students, pick next class strictly avoiding all forbidden (diagonal & horizontal) neighbors
            if (!student) {
              student = getNextStudentAvoiding(forbidden);
            }

            if (!student) break;

            colMatrix[rIdx][posIdx] = student;
            lastAssignedClassIdAcrossRooms = student.classId;
          }
        }

        // Post-allocation conflict resolution solver: Ensure 0 diagonal and 0 horizontal collisions
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < spb; c++) {
            const student = colMatrix[r][c];
            if (!student) continue;

            const forbidden = getForbiddenClasses(colMatrix, r, c, spb, numRows);
            if (forbidden.includes(student.classId)) {
              // Conflict detected! Find another cell (r2, c2) in this column to swap with
              let swapped = false;
              for (let r2 = 0; r2 < numRows && !swapped; r2++) {
                for (let c2 = 0; c2 < spb && !swapped; c2++) {
                  if (r === r2 && c === c2) continue;
                  const candidate = colMatrix[r2][c2];
                  if (!candidate || candidate.classId === student.classId) continue;

                  // Temporarily swap
                  colMatrix[r][c] = candidate;
                  colMatrix[r2][c2] = student;

                  const forbiddenAfterAtRC = getForbiddenClasses(colMatrix, r, c, spb, numRows);
                  const forbiddenAfterAtR2C2 = getForbiddenClasses(colMatrix, r2, c2, spb, numRows);

                  if (!forbiddenAfterAtRC.includes(candidate.classId) && !forbiddenAfterAtR2C2.includes(student.classId)) {
                    swapped = true;
                  } else {
                    // Revert swap
                    colMatrix[r][c] = student;
                    colMatrix[r2][c2] = candidate;
                  }
                }
              }
            }
          }
        }

        // Convert matrix to actual seat plan entries with sequential seat numbering
        for (let rIdx = 0; rIdx < numRows; rIdx++) {
          const benchNo = globalBenchNumber++;

          for (let posIdx = 0; posIdx < spb; posIdx++) {
            const student = colMatrix[rIdx][posIdx];
            if (!student) continue;

            let positionLabel = `SEAT-${posIdx + 1}`;
            if (spb === 1) {
              positionLabel = 'SINGLE';
            } else if (spb === 2) {
              positionLabel = posIdx === 0 ? 'LEFT' : 'RIGHT';
            } else if (spb === 3) {
              positionLabel = posIdx === 0 ? 'LEFT' : posIdx === 1 ? 'MIDDLE' : 'RIGHT';
            } else if (spb === 4) {
              positionLabel = posIdx === 0 ? 'LEFT' : posIdx === 1 ? 'MID-L' : posIdx === 2 ? 'MID-R' : 'RIGHT';
            }

            const formattedSeatNo = `Seat ${String(roomSeatCounter).padStart(2, '0')}`;

            newSeatPlans.push({
              examId: exId,
              shift: shiftName,
              roomId: room.id,
              benchNo: benchNo,
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

