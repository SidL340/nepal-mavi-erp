const express = require('express');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const multer = require('multer');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || './uploads' });

// Generate random password
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET /api/students — list all with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, search, page, limit } = req.query;
    const where = { isActive: true };
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { studentId: { contains: search } },
        { fatherName: { contains: search } },
      ];
    }
    if (classId) {
      where.classEnrollment = { some: { classId: parseInt(classId), isActive: true } };
    }

    const isAll = !limit || limit === 'all';
    const parsedLimit = isAll ? 10000 : parseInt(limit);
    const parsedPage = page ? parseInt(page) : 1;
    const skip = isAll ? 0 : (parsedPage - 1) * parsedLimit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          classEnrollment: { where: { isActive: true }, include: { class: true } },
          user: { select: { username: true, isActive: true } },
        },
        skip,
        take: parsedLimit,
      }),
      prisma.student.count({ where }),
    ]);

    // Natural Sorting: Class order -> Roll No (1, 2, 3...) -> Normalized Name (A to Z)
    students.sort((a, b) => {
      const enrolA = a.classEnrollment?.[0];
      const enrolB = b.classEnrollment?.[0];

      if (enrolA?.class && enrolB?.class) {
        const orderA = enrolA.class.orderIndex !== undefined ? enrolA.class.orderIndex : 0;
        const orderB = enrolB.class.orderIndex !== undefined ? enrolB.class.orderIndex : 0;
        if (orderA !== orderB) return orderA - orderB;

        const rollA = enrolA.rollNo ?? 99999;
        const rollB = enrolB.rollNo ?? 99999;
        if (rollA !== rollB) return rollA - rollB;
      } else if (enrolA?.class && !enrolB?.class) {
        return -1;
      } else if (!enrolA?.class && enrolB?.class) {
        return 1;
      }

      const cleanA = (a.fullName || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const cleanB = (b.fullName || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    return res.json({ success: true, data: students, total, page: parsedPage, limit: parsedLimit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, username: true, isActive: true, role: true } },
        classEnrollment: { include: { class: { include: { classTeacher: true } } } },
        attendances: { orderBy: { dateBs: 'desc' }, take: 30 },
        feeCollections: { include: { feeHead: true }, orderBy: { paidDateAd: 'desc' } },
        libraryIssues: { include: { book: true }, orderBy: { createdAt: 'desc' } },
        certificates: { orderBy: { issuedDateAd: 'desc' } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/students/:id/photo — upload / update student photo
router.post('/:id/photo', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    
    // Permission check: student can only update their own photo, admins/teachers can update any
    if (req.user.role === 'STUDENT' && req.user.student?.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Permission denied: you can only update your own photo.' });
    }

    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ success: false, message: 'Photo data is required.' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl },
    });

    return res.json({
      success: true,
      data: updatedStudent,
      message: 'Student photo updated successfully!',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/students — add single student
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fullName, fullNameNepali, gender, dateOfBirthBs, address, phone,
      fatherName, motherName, guardianName, guardianContact, guardianRelation,
      emisId, admissionDateBs, classId, rollNo, previousSchool, bloodGroup,
      religion, ethnicity, disability
    } = req.body;

    const studentId = emisId || `STU-${Date.now()}`;
    const username = studentId;
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: 'STUDENT', mustChangePassword: false },
      });
      const student = await tx.student.create({
        data: {
          userId: user.id, studentId, fullName, fullNameNepali, gender,
          dateOfBirthBs, address, phone, fatherName, motherName, guardianName,
          guardianContact, guardianRelation, emisId, admissionDateBs, previousSchool,
          bloodGroup, religion, ethnicity, disability,
        },
      });
      if (classId) {
        await tx.classEnrollment.create({
          data: { studentId: student.id, classId: parseInt(classId), rollNo: rollNo ? parseInt(rollNo) : null },
        });
      }

      // Auto-generate Admission Fee due
      const admissionHead = await tx.feeHead.findFirst({
        where: { OR: [{ name: { contains: 'Admission' } }, { nameNepali: { contains: 'भर्ना' } }], isActive: true },
      });
      if (admissionHead) {
        let feeAmount = admissionHead.amount;
        if (classId) {
          const classStruct = await tx.classFeeStructure.findUnique({
            where: { classId_feeHeadId: { classId: parseInt(classId), feeHeadId: admissionHead.id } },
          });
          if (classStruct) feeAmount = classStruct.amount;
        }
        await tx.studentFeeDue.create({
          data: {
            studentId: student.id,
            feeHeadId: admissionHead.id,
            amount: feeAmount,
            remarks: 'Auto-billed Admission Fee on Enrollment',
          },
        }).catch(() => {});
      }

      return { student, plainPassword };
    });

    return res.status(201).json({
      success: true,
      data: result.student,
      credentials: { username, password: result.plainPassword },
      message: 'Student created. Save the password shown — it will not be shown again.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

function normalizeClassName(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    return `Class ${str}`;
  }
  if (str.toLowerCase().startsWith('class') || str.toLowerCase().startsWith('grade')) {
    return str;
  }
  if (str.toLowerCase().includes('ecd') || str.toLowerCase().includes('ppc')) return 'ECD/PPC';
  if (str.toLowerCase().includes('nursery')) return 'Nursery';
  if (str.toLowerCase().includes('lkg')) return 'LKG';
  if (str.toLowerCase().includes('ukg')) return 'UKG';
  return str;
}

function getClassRank(name) {
  if (!name) return 999;
  const lower = name.toLowerCase().trim();
  if (lower.includes('play') || lower.includes('pg')) return -4;
  if (lower.includes('nursery') || lower.includes('shishu') || lower.includes('ecd') || lower.includes('ppc')) return -3;
  if (lower.includes('lkg') || lower.includes('lower kg') || lower.includes('kg 1')) return -2;
  if (lower.includes('ukg') || lower.includes('upper kg') || lower.includes('kg 2') || lower.includes('kg')) return -1;
  const match = name.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return 100;
}

// POST /api/students/bulk-import — Ultra-Fast IEMIS Excel import with Smart Multi-Class Auto-Enrollment
router.post('/bulk-import', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file required.' });
    
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    let explicitClassId = req.body.classId ? parseInt(req.body.classId) : null;

    // Delete temp file
    try { require('fs').unlinkSync(req.file.path); } catch (e) {}

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty.' });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };
    const affectedClassIds = new Set();

    // Get Active Academic Year
    let activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst({ orderBy: { id: 'desc' } });
    }
    const academicYearId = activeYear ? activeYear.id : 1;

    // Load existing classes for fast lookup
    const existingClasses = await prisma.class.findMany({
      where: { academicYearId },
    });
    
    // Map of normalizedName+section -> classId
    const classLookup = new Map();
    for (const c of existingClasses) {
      const key = `${c.name.toLowerCase().trim()}__${(c.section || '').toLowerCase().trim()}`;
      classLookup.set(key, c.id);
      // Also alias without "Class " prefix e.g. "9__"
      const match = c.name.match(/\d+/);
      if (match) {
        classLookup.set(`${match[0]}__${(c.section || '').toLowerCase().trim()}`, c.id);
      }
    }

    // Helper to get or auto-create class from row
    async function resolveClassId(row) {
      if (explicitClassId) return explicitClassId;
      const rawClass = row['CurrentClass'] || row['Current Class'] || row['Class'] || row['Grade'] || row['currentClass'];
      if (!rawClass) return null;
      
      const normalizedName = normalizeClassName(rawClass);
      const rawSection = String(row['Section'] || row['section'] || '').trim() || null;
      const key = `${normalizedName.toLowerCase().trim()}__${(rawSection || '').toLowerCase().trim()}`;

      if (classLookup.has(key)) {
        return classLookup.get(key);
      }

      // Check without section
      const keyNoSec = `${normalizedName.toLowerCase().trim()}__`;
      if (classLookup.has(keyNoSec)) {
        return classLookup.get(keyNoSec);
      }

      // Auto-create class on the fly
      const newClass = await prisma.class.create({
        data: {
          name: normalizedName,
          section: rawSection,
          academicYearId,
          orderIndex: getClassRank(normalizedName),
        },
      });
      classLookup.set(key, newClass.id);
      classLookup.set(keyNoSec, newClass.id);
      return newClass.id;
    }

    // Precompute default student password hash once
    const defaultPasswordHash = await bcrypt.hash('Student@2081', 10);

    // Extract all candidate IDs
    const candidateIds = rows
      .map(r => String(r['Student Id'] || r['Student ID'] || r['IEMIS Code'] || r['studentId'] || '').trim())
      .filter(Boolean);

    // Batch query existing student IDs
    const existingList = await prisma.student.findMany({
      where: { studentId: { in: candidateIds } },
      include: { classEnrollment: { where: { isActive: true } } },
    });
    const existingMap = new Map(existingList.map(s => [s.studentId, s]));

    // Process rows
    for (const row of rows) {
      try {
        const emisId      = String(row['Student Id'] || row['Student ID'] || row['IEMIS Code'] || row['studentId'] || '').trim();
        const fullName    = String(row['FullName'] || row['Full Name'] || row['Name'] || '').trim();
        if (!fullName) { results.skipped++; continue; }

        const studentId = emisId || `STU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const targetClassId = await resolveClassId(row);
        const rollNo = row['S.N'] || row['Roll No'] || row['rollNo'] || null;

        if (existingMap.has(studentId)) {
          // If student already exists, update/assign their class enrollment if not yet assigned
          const existingStudent = existingMap.get(studentId);
          if (targetClassId && (!existingStudent.classEnrollment || existingStudent.classEnrollment.length === 0)) {
            await prisma.classEnrollment.create({
              data: {
                studentId: existingStudent.id,
                classId: targetClassId,
                rollNo: rollNo ? parseInt(rollNo) : null,
                isActive: true,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
          continue;
        }

        const fatherName      = String(row['Father Name'] || '').trim() || null;
        const motherName      = String(row['Mother Name'] || '').trim() || null;
        const guardianName    = String(row['Guardian Name'] || '').trim() || null;
        const guardianContact = String(row['Guardian Contact Number'] || row['Guardian Contact'] || '').trim() || null;
        const gender          = String(row['Gender'] || '').trim() || null;
        const permAddress     = String(row['Permanent Address'] || '').trim() || null;
        const dob             = String(row['DOB'] || '').trim() || null;
        const motherTongue    = String(row['Mother Tongue'] || '').trim() || null;
        const disabilityType  = String(row['Disability Type'] || '').trim() || null;

        const user = await prisma.user.create({
          data: { username: studentId, passwordHash: defaultPasswordHash, role: 'STUDENT' },
        });

        const student = await prisma.student.create({
          data: {
            userId: user.id,
            studentId,
            fullName,
            fatherName,
            motherName,
            guardianName,
            guardianContact,
            emisId,
            gender,
            address: permAddress,
            dateOfBirthBs: dob,
            ethnicity: motherTongue,
            disability: disabilityType,
          },
        });

        if (targetClassId) {
          affectedClassIds.add(targetClassId);
          await prisma.classEnrollment.create({
            data: {
              studentId: student.id,
              classId: targetClassId,
              rollNo: rollNo ? parseInt(rollNo) : null,
              isActive: true,
            },
          });
        }

        results.created++;
      } catch (rowErr) {
        results.errors.push({ row: String(row['FullName'] || 'Unknown'), error: rowErr.message });
      }
    }

    // Auto-assign sequential roll numbers (1, 2, 3...) alphabetically for all affected classes
    for (const cId of affectedClassIds) {
      try {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { classId: cId, isActive: true },
          include: { student: { select: { fullName: true, emisId: true } } },
        });
        enrollments.sort((a, b) => {
          const nameA = (a.student?.fullName || '').trim().toLowerCase();
          const nameB = (b.student?.fullName || '').trim().toLowerCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.student?.emisId || '').localeCompare(b.student?.emisId || '');
        });
        for (let i = 0; i < enrollments.length; i++) {
          await prisma.classEnrollment.update({
            where: { id: enrollments[i].id },
            data: { rollNo: i + 1 },
          });
        }
      } catch (rollErr) {
        console.error('Error auto-assigning roll numbers for class', cId, rollErr);
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/credentials/export — bulk credentials list
router.get('/credentials/export', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { classId } = req.query;
    const where = { isActive: true };
    if (classId) where.classEnrollment = { some: { classId: parseInt(classId), isActive: true } };

    const students = await prisma.student.findMany({
      where,
      include: { user: { select: { username: true } }, classEnrollment: { include: { class: true } } },
      orderBy: { fullName: 'asc' },
    });

    const data = students.map(s => ({
      'Student ID': s.studentId,
      'Name': s.fullName,
      'Username (Login ID)': s.user?.username,
      'Class': s.classEnrollment?.[0]?.class?.name || '',
      'Note': 'Password was set at time of creation. Reset from Admin if forgotten.',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=student-credentials.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const student = await prisma.student.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    return res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/students/:id (soft delete)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.student.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Student deactivated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
