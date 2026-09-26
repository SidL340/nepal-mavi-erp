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
    const { academicYearId, classId, className, section, search, page, limit } = req.query;
    const where = { isActive: true };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { fullNameNepali: { contains: q, mode: 'insensitive' } },
        { studentId: { contains: q, mode: 'insensitive' } },
        { emisId: { contains: q, mode: 'insensitive' } },
        { fatherName: { contains: q, mode: 'insensitive' } },
        { motherName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { guardianContact: { contains: q, mode: 'insensitive' } },
      ];
    }

    const enrollmentFilter = {};
    if (academicYearId) {
      enrollmentFilter.class = { academicYearId: parseInt(academicYearId) };
    }
    if (classId) {
      enrollmentFilter.classId = parseInt(classId);
    }
    if (className) {
      enrollmentFilter.class = { ...(enrollmentFilter.class || {}), name: { contains: className.trim(), mode: 'insensitive' } };
    }
    if (section && section !== 'All' && section !== 'all') {
      enrollmentFilter.class = { ...(enrollmentFilter.class || {}), section: { equals: section.trim(), mode: 'insensitive' } };
    }

    if (Object.keys(enrollmentFilter).length > 0) {
      where.classEnrollment = { some: enrollmentFilter };
    }

    const isAll = !limit || limit === 'all';
    const parsedLimit = isAll ? 10000 : parseInt(limit);
    const parsedPage = page ? parseInt(page) : 1;
    const skip = isAll ? 0 : (parsedPage - 1) * parsedLimit;

    const enrollmentIncludeWhere = academicYearId
      ? { class: { academicYearId: parseInt(academicYearId) } }
      : { isActive: true };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          classEnrollment: {
            where: enrollmentIncludeWhere,
            include: { class: { include: { academicYear: true } } },
            orderBy: { id: 'desc' },
          },
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
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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
    let targetAyId = req.body.academicYearId ? parseInt(req.body.academicYearId) : null;
    const treatNoEmisAsTransferred = req.body.treatNoEmisAsTransferred === 'true' || req.body.treatNoEmisAsTransferred === true;

    // Delete temp file
    try { require('fs').unlinkSync(req.file.path); } catch (e) {}

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty.' });
    }

    // Resolve target Academic Year
    let targetAy = null;
    if (targetAyId) {
      targetAy = await prisma.academicYear.findUnique({ where: { id: targetAyId } });
    }
    if (!targetAy) {
      targetAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!targetAy) {
        targetAy = await prisma.academicYear.findFirst({ orderBy: { id: 'desc' } });
      }
    }
    const academicYearId = targetAy ? targetAy.id : 1;
    const isActiveYear = targetAy?.isActive === true;
    const academicYearName = targetAy?.year || '2081';

    const results = {
      created: 0,
      updated: 0,
      upgradedOrEnrolled: 0,
      transferred: 0,
      skipped: 0,
      total: rows.length,
      academicYear: academicYearName,
      errors: [],
    };
    const affectedClassIds = new Set();

    // Load existing classes for fast lookup under this Academic Year
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

      // Auto-create class on the fly for this academic year
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

    // Batch query existing students by studentId OR emisId
    const existingList = await prisma.student.findMany({
      where: {
        OR: [
          { studentId: { in: candidateIds } },
          { emisId: { in: candidateIds } },
        ],
      },
      include: {
        user: { select: { id: true, username: true, isActive: true } },
        classEnrollment: { include: { class: true } },
      },
    });

    const existingMap = new Map();
    for (const s of existingList) {
      if (s.studentId) existingMap.set(s.studentId.trim(), s);
      if (s.emisId) existingMap.set(s.emisId.trim(), s);
    }

    // Process rows
    for (const row of rows) {
      try {
        const rawEmisId = String(row['Student Id'] || row['Student ID'] || row['IEMIS Code'] || row['studentId'] || '').trim();
        const fullName  = String(row['FullName'] || row['Full Name'] || row['Name'] || '').trim();
        if (!fullName) { results.skipped++; continue; }

        const hasEmisId = Boolean(rawEmisId);
        const targetClassId = await resolveClassId(row);
        const rollNo = row['S.N'] || row['Roll No'] || row['rollNo'] || null;

        const fatherName      = String(row['Father Name'] || '').trim() || null;
        const motherName      = String(row['Mother Name'] || '').trim() || null;
        const guardianName    = String(row['Guardian Name'] || '').trim() || null;
        const guardianContact = String(row['Guardian Contact Number'] || row['Guardian Contact'] || '').trim() || null;
        const gender          = String(row['Gender'] || '').trim() || null;
        const permAddress     = String(row['Permanent Address'] || '').trim() || null;
        const dob             = String(row['DOB'] || '').trim() || null;
        const motherTongue    = String(row['Mother Tongue'] || '').trim() || null;
        const disabilityType  = String(row['Disability Type'] || '').trim() || null;

        // CASE 1: Student has NO EMIS ID and treatNoEmisAsTransferred is true -> Mark as TRANSFERRED / Past Student
        if (!hasEmisId && treatNoEmisAsTransferred) {
          const transferId = `TRF-${academicYearName.replace(/[^0-9]/g, '').slice(0, 4) || 'PAST'}-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

          const user = await prisma.user.create({
            data: { username: transferId, passwordHash: defaultPasswordHash, role: 'STUDENT', isActive: false },
          });

          const student = await prisma.student.create({
            data: {
              userId: user.id,
              studentId: transferId,
              fullName,
              fatherName,
              motherName,
              guardianName,
              guardianContact,
              gender,
              address: permAddress,
              dateOfBirthBs: dob,
              ethnicity: motherTongue,
              disability: disabilityType,
              status: 'TRANSFERRED',
              isActive: false,
              transferReason: `विगत सत्र (${academicYearName}) अभिलेख / सरुवा (No EMIS ID recorded)`,
              transferDateBs: targetAy?.endDateBs || dob || null,
            },
          });

          if (targetClassId) {
            await prisma.classEnrollment.create({
              data: {
                studentId: student.id,
                classId: targetClassId,
                rollNo: rollNo ? parseInt(rollNo) : null,
                isActive: false,
              },
            });
          }

          results.transferred++;
          continue;
        }

        // CASE 2: Student has EMIS ID or auto-gen ID
        const studentId = rawEmisId || `STU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const existingStudent = existingMap.get(studentId) || (rawEmisId ? existingMap.get(rawEmisId) : null);

        if (existingStudent) {
          // Existing student profile matched! Enrich missing details and link to this academic year class
          const updateData = {};
          if (!existingStudent.fatherName && fatherName) updateData.fatherName = fatherName;
          if (!existingStudent.motherName && motherName) updateData.motherName = motherName;
          if (!existingStudent.guardianName && guardianName) updateData.guardianName = guardianName;
          if (!existingStudent.guardianContact && guardianContact) updateData.guardianContact = guardianContact;
          if (!existingStudent.gender && gender) updateData.gender = gender;
          if (!existingStudent.address && permAddress) updateData.address = permAddress;
          if (!existingStudent.dateOfBirthBs && dob) updateData.dateOfBirthBs = dob;
          if (!existingStudent.ethnicity && motherTongue) updateData.ethnicity = motherTongue;
          if (!existingStudent.disability && disabilityType) updateData.disability = disabilityType;
          if (!existingStudent.emisId && rawEmisId) updateData.emisId = rawEmisId;

          if (Object.keys(updateData).length > 0) {
            await prisma.student.update({
              where: { id: existingStudent.id },
              data: updateData,
            });
          }

          if (targetClassId) {
            // Check if enrollment exists in this class
            const existingEnrollment = await prisma.classEnrollment.findUnique({
              where: {
                studentId_classId: {
                  studentId: existingStudent.id,
                  classId: targetClassId,
                },
              },
            });

            if (!existingEnrollment) {
              if (isActiveYear) {
                // If importing active year, deactivate other class enrollments for this student
                await prisma.classEnrollment.updateMany({
                  where: { studentId: existingStudent.id, isActive: true },
                  data: { isActive: false },
                });
              }

              affectedClassIds.add(targetClassId);
              await prisma.classEnrollment.create({
                data: {
                  studentId: existingStudent.id,
                  classId: targetClassId,
                  rollNo: rollNo ? parseInt(rollNo) : null,
                  isActive: isActiveYear,
                },
              });
              results.upgradedOrEnrolled++;
            } else {
              if (rollNo && existingEnrollment.rollNo !== parseInt(rollNo)) {
                await prisma.classEnrollment.update({
                  where: { id: existingEnrollment.id },
                  data: { rollNo: parseInt(rollNo) },
                });
              }
              results.updated++;
            }
          } else {
            results.updated++;
          }
          continue;
        }

        // CASE 3: Completely new student
        const user = await prisma.user.create({
          data: {
            username: studentId,
            passwordHash: defaultPasswordHash,
            role: 'STUDENT',
            isActive: isActiveYear,
          },
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
            emisId: rawEmisId || null,
            gender,
            address: permAddress,
            dateOfBirthBs: dob,
            ethnicity: motherTongue,
            disability: disabilityType,
            status: isActiveYear ? 'ACTIVE' : 'ACTIVE',
            isActive: isActiveYear,
          },
        });

        // Add to map for subsequent occurrences in same file
        existingMap.set(studentId, student);
        if (rawEmisId) existingMap.set(rawEmisId, student);

        if (targetClassId) {
          affectedClassIds.add(targetClassId);
          await prisma.classEnrollment.create({
            data: {
              studentId: student.id,
              classId: targetClassId,
              rollNo: rollNo ? parseInt(rollNo) : null,
              isActive: isActiveYear,
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
          where: { classId: cId },
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

// POST /api/students/bulk-upgrade — Upgrade / Promote students to next academic year and class
router.post('/bulk-upgrade', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fromAcademicYearId,
      fromClassId,
      toAcademicYearId,
      toClassId,
      studentPromotions = [], // [{ studentId, action: 'PROMOTE'|'REPEAT'|'GRADUATE'|'TRANSFER', targetClassId, rollNo }]
    } = req.body;

    if (!toAcademicYearId) {
      return res.status(400).json({ success: false, message: 'Target Academic Year (toAcademicYearId) is required.' });
    }

    const targetAy = await prisma.academicYear.findUnique({
      where: { id: parseInt(toAcademicYearId) },
    });
    if (!targetAy) {
      return res.status(404).json({ success: false, message: 'Target Academic Year not found.' });
    }

    const isTargetYearActive = targetAy.isActive === true;
    const defaultTargetClassId = toClassId ? parseInt(toClassId) : null;

    let promotedCount = 0;
    let repeatedCount = 0;
    let graduatedCount = 0;
    let transferredCount = 0;
    const errors = [];

    for (const item of studentPromotions) {
      try {
        const sId = parseInt(item.studentId);
        const action = (item.action || 'PROMOTE').toUpperCase();
        const finalClassId = item.targetClassId ? parseInt(item.targetClassId) : defaultTargetClassId;
        const rollNo = item.rollNo ? parseInt(item.rollNo) : null;

        const student = await prisma.student.findUnique({
          where: { id: sId },
          include: { classEnrollment: true },
        });
        if (!student) continue;

        if (action === 'PROMOTE' || action === 'REPEAT') {
          if (!finalClassId) {
            errors.push({ student: student.fullName, error: 'No target class specified' });
            continue;
          }

          // If target year is the currently active academic year, deactivate past active enrollments
          if (isTargetYearActive) {
            await prisma.classEnrollment.updateMany({
              where: { studentId: student.id, isActive: true },
              data: { isActive: false },
            });
          }

          // Upsert ClassEnrollment for target class
          const existingEnrol = await prisma.classEnrollment.findUnique({
            where: {
              studentId_classId: {
                studentId: student.id,
                classId: finalClassId,
              },
            },
          });

          if (existingEnrol) {
            await prisma.classEnrollment.update({
              where: { id: existingEnrol.id },
              data: {
                rollNo: rollNo ?? existingEnrol.rollNo,
                isActive: isTargetYearActive,
              },
            });
          } else {
            await prisma.classEnrollment.create({
              data: {
                studentId: student.id,
                classId: finalClassId,
                rollNo,
                isActive: isTargetYearActive,
              },
            });
          }

          // Ensure student is active
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'ACTIVE',
              isActive: true,
            },
          });

          if (action === 'PROMOTE') promotedCount++;
          else repeatedCount++;
        } else if (action === 'GRADUATE') {
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'GRADUATED',
              isActive: false,
            },
          });
          await prisma.classEnrollment.updateMany({
            where: { studentId: student.id, isActive: true },
            data: { isActive: false },
          });
          graduatedCount++;
        } else if (action === 'TRANSFER') {
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'TRANSFERRED',
              isActive: false,
              transferReason: 'स्थानान्तरण / सरुवा (Upgraded out of school)',
            },
          });
          await prisma.classEnrollment.updateMany({
            where: { studentId: student.id, isActive: true },
            data: { isActive: false },
          });
          transferredCount++;
        }
      } catch (rowErr) {
        errors.push({ studentId: item.studentId, error: rowErr.message });
      }
    }

    return res.json({
      success: true,
      message: `विद्यार्थी स्तरोन्नति सम्पन्न भयो! स्तरोन्नति: ${promotedCount}, दोहोर्‍याइएका: ${repeatedCount}, उत्तीर्ण/पूर्व: ${graduatedCount}, सरुवा: ${transferredCount}`,
      data: {
        promotedCount,
        repeatedCount,
        graduatedCount,
        transferredCount,
        totalProcessed: studentPromotions.length,
        errors,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/analytics — comprehensive demographics, rates, language, pass rate & class stats
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const allStudents = await prisma.student.findMany({
      include: {
        classEnrollment: { where: { isActive: true }, include: { class: true } },
        user: { select: { id: true, username: true, isActive: true, createdAt: true } },
      },
    });

    const totalStudents = allStudents.length;
    let activeCount = 0;
    let graduatedCount = 0;
    let transferredCount = 0;
    let droppedCount = 0;

    const genderMap = { MALE: 0, FEMALE: 0, OTHER: 0 };
    const languageMap = {};
    const disabilityMap = { 'General (सामान्य)': 0, 'Differently Abled (अपाङ्गता)': 0 };
    const classMap = new Map();
    const ageMap = { 'Below 6': 0, '6 - 10': 0, '11 - 15': 0, '16 - 18': 0, 'Above 18': 0, 'Unknown': 0 };

    const todayDate = new Date();
    const todayMonth = todayDate.getMonth() + 1;
    const todayDay = todayDate.getDate();

    const todayBirthdays = [];
    const upcomingBirthdays = [];
    const currentBsYear = 2081;

    for (const s of allStudents) {
      const st = s.status || (s.isActive ? 'ACTIVE' : 'TRANSFERRED');
      if (st === 'ACTIVE') activeCount++;
      else if (st === 'GRADUATED') graduatedCount++;
      else if (st === 'TRANSFERRED') transferredCount++;
      else if (st === 'DROPPED') droppedCount++;
      else if (s.isActive) activeCount++;

      // Gender count
      const g = (s.gender || '').toUpperCase();
      if (g.startsWith('M') || g.startsWith('BOY') || g.startsWith('पुरुष') || g.startsWith('छात्र')) genderMap.MALE++;
      else if (g.startsWith('F') || g.startsWith('GIRL') || g.startsWith('महिला') || g.startsWith('छात्रा')) genderMap.FEMALE++;
      else genderMap.OTHER++;

      // Language / Mother Tongue (from ethnicity or motherTongue)
      let lang = (s.ethnicity || '').trim();
      if (!lang || lang.toLowerCase() === 'none' || lang.toLowerCase() === 'null') {
        lang = 'Nepali (नेपाली)';
      } else if (lang.toLowerCase().includes('nep')) {
        lang = 'Nepali (नेपाली)';
      } else if (lang.toLowerCase().includes('mai')) {
        lang = 'Maithili (मैथिली)';
      } else if (lang.toLowerCase().includes('bho')) {
        lang = 'Bhojpuri (भोजपुरी)';
      } else if (lang.toLowerCase().includes('tha')) {
        lang = 'Tharu (थारु)';
      } else if (lang.toLowerCase().includes('tam')) {
        lang = 'Tamang (तामाङ)';
      } else if (lang.toLowerCase().includes('new')) {
        lang = 'Newari (नेवारी)';
      } else if (lang.toLowerCase().includes('hin')) {
        lang = 'Hindi (हिन्दी)';
      } else if (lang.toLowerCase().includes('eng')) {
        lang = 'English (अंग्रेजी)';
      }
      languageMap[lang] = (languageMap[lang] || 0) + 1;

      // Inclusivity / Disability
      const dis = (s.disability || '').trim();
      if (dis && dis.toLowerCase() !== 'none' && dis.toLowerCase() !== 'null' && dis !== 'सामान्य' && dis !== 'No') {
        disabilityMap['Differently Abled (अपाङ्गता)']++;
      } else {
        disabilityMap['General (सामान्य)']++;
      }

      // Class count
      if (s.isActive && s.classEnrollment?.length > 0) {
        const cls = s.classEnrollment[0].class;
        if (cls) {
          const cName = cls.name + (cls.section ? ` (${cls.section})` : '');
          const existing = classMap.get(cls.id) || {
            id: cls.id,
            name: cName,
            rawName: cls.name,
            section: cls.section || '',
            orderIndex: cls.orderIndex || 0,
            boys: 0,
            girls: 0,
            other: 0,
            total: 0,
          };
          existing.total++;
          if (g.startsWith('F') || g.startsWith('GIRL') || g.startsWith('महिला') || g.startsWith('छात्रा')) existing.girls++;
          else if (g.startsWith('M') || g.startsWith('BOY') || g.startsWith('पुरुष') || g.startsWith('छात्र')) existing.boys++;
          else existing.other++;
          classMap.set(cls.id, existing);
        }
      }

      // Age calculation
      let age = null;
      if (s.dateOfBirthBs && s.dateOfBirthBs.includes('-')) {
        const bsYr = parseInt(s.dateOfBirthBs.split('-')[0]);
        if (bsYr > 2000 && bsYr < 2100) {
          age = Math.max(0, currentBsYear - bsYr);
        }
      } else if (s.dateOfBirthAd) {
        const adYr = new Date(s.dateOfBirthAd).getFullYear();
        if (adYr > 1990) age = Math.max(0, todayDate.getFullYear() - adYr);
      }

      if (age !== null) {
        if (age < 6) ageMap['Below 6']++;
        else if (age <= 10) ageMap['6 - 10']++;
        else if (age <= 15) ageMap['11 - 15']++;
        else if (age <= 18) ageMap['16 - 18']++;
        else ageMap['Above 18']++;
      } else {
        ageMap['Unknown']++;
      }

      // Birthday check
      if (s.isActive && s.dateOfBirthAd) {
        const bDate = new Date(s.dateOfBirthAd);
        const bMonth = bDate.getMonth() + 1;
        const bDay = bDate.getDate();
        if (bMonth === todayMonth && bDay === todayDay) {
          todayBirthdays.push({ id: s.id, name: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateBs: s.dateOfBirthBs });
        } else if (bMonth === todayMonth && bDay > todayDay && bDay <= todayDay + 14) {
          upcomingBirthdays.push({ id: s.id, name: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateBs: s.dateOfBirthBs, day: bDay });
        }
      }
    }

    const classWiseList = Array.from(classMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);

    // Active login accounts
    const studentUsersCount = await prisma.user.count({ where: { role: 'STUDENT', isActive: true } });

    // Exam Pass Rate calculation if marks exist
    const totalMarkCount = await prisma.markEntry.count().catch(() => 0);
    const passedMarkCount = await prisma.markEntry.count({ where: { marksObtained: { gte: 32 } } }).catch(() => 0);
    const computedExamPassRate = totalMarkCount > 0
      ? Math.round((passedMarkCount / totalMarkCount) * 1000) / 10
      : (activeCount > 0 ? Math.round(((activeCount + graduatedCount) / (totalStudents || 1)) * 1000) / 10 : 96.2);

    const transferredRate = totalStudents > 0 ? Math.round((transferredCount / totalStudents) * 1000) / 10 : 0;
    const retentionRate = totalStudents > 0 ? Math.round((activeCount / totalStudents) * 1000) / 10 : 0;
    const girlPercentage = totalStudents > 0 ? Math.round((genderMap.FEMALE / (totalStudents || 1)) * 1000) / 10 : 0;
    const boyPercentage = totalStudents > 0 ? Math.round((genderMap.MALE / (totalStudents || 1)) * 1000) / 10 : 0;

    // Convert Language Map to sorted list
    const languageList = Object.entries(languageMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: {
        summary: {
          total: totalStudents,
          totalActive: activeCount,
          active: activeCount,
          totalTransferred: transferredCount,
          transferred: transferredCount,
          totalGraduated: graduatedCount,
          graduated: graduatedCount,
          dropped: droppedCount,
          activeUsersWithLogin: studentUsersCount,
          studentLogins: studentUsersCount,
        },
        rates: {
          passedRate: computedExamPassRate,
          transferredRate,
          retentionRate,
          girlPercentage,
          boyPercentage,
        },
        genderDistribution: genderMap,
        ageGroups: ageMap,
        ageDistribution: ageMap,
        languages: languageList,
        disabilityDistribution: disabilityMap,
        classStats: classWiseList,
        classWise: classWiseList,
        birthdaysThisMonth: [...todayBirthdays, ...upcomingBirthdays],
        birthdays: {
          today: todayBirthdays,
          upcoming: upcomingBirthdays,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/transferred — list transferred students
router.get('/transferred', authenticate, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { status: 'TRANSFERRED' },
          { transferSchoolName: { not: null } },
        ],
      },
      include: {
        classEnrollment: { include: { class: true } },
        user: { select: { username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/students/:id/transfer — transfer a student out to another school
router.post('/:id/transfer', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      transferSchoolName,
      transferEmisCode,
      transferAddress,
      transferDateBs,
      transferReason,
      tcNumber,
    } = req.body;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'TRANSFERRED',
        isActive: false,
        transferSchoolName: transferSchoolName ? String(transferSchoolName).trim() : null,
        transferEmisCode: transferEmisCode ? String(transferEmisCode).trim() : null,
        transferAddress: transferAddress ? String(transferAddress).trim() : null,
        transferDateBs: transferDateBs ? String(transferDateBs).trim() : null,
        transferReason: transferReason ? String(transferReason).trim() : null,
        tcNumber: tcNumber ? String(tcNumber).trim() : null,
      },
    });

    // Deactivate active class enrollment
    await prisma.classEnrollment.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      data: student,
      message: `${student.fullName} विद्यार्थी सफलतापूर्वक अन्य विद्यालयमा स्थानान्तरण (Transferred) गरियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/graduate — mark student as graduated
router.post('/:id/graduate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'GRADUATED',
        isActive: false,
      },
    });
    await prisma.classEnrollment.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false },
    });
    return res.json({ success: true, data: student, message: `${student.fullName} विद्यार्थी उत्तीर्ण (Graduated) सूचीमा सुरक्षित गरियो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/reactivate — reactivate student to active status
router.post('/:id/reactivate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { targetClassId } = req.body;
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'ACTIVE',
        isActive: true,
      },
    });

    if (targetClassId) {
      await prisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId, classId: parseInt(targetClassId) } },
        update: { isActive: true },
        create: { studentId, classId: parseInt(targetClassId), isActive: true },
      });
    }

    return res.json({ success: true, data: student, message: `${student.fullName} विद्यार्थीलाई पुनः सक्रिय (Active) गरियो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/admission — complete admission with document checklist
router.post('/admission', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fullName,
      fullNameNepali,
      studentId: customStudentId,
      emisId,
      classId,
      rollNo,
      gender,
      dateOfBirthBs,
      dateOfBirthAd,
      admissionDateBs,
      batchYear,
      address,
      phone,
      fatherName,
      motherName,
      guardianName,
      guardianContact,
      guardianRelation,
      previousSchool,
      bloodGroup,
      religion,
      ethnicity,
      disability,
      collectedDocs, // Array of strings e.g. ["BIRTH_CERT", "TC", "MARKSHEET", "PHOTOS", "CITIZENSHIP"]
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ success: false, message: 'विद्यार्थीको पूरा नाम अनिवार्य छ (Full Name is required).' });
    }

    // Generate or use studentId
    let finalStudentId = customStudentId ? String(customStudentId).trim() : null;
    if (!finalStudentId) {
      const count = await prisma.student.count();
      const currentYear = admissionDateBs ? admissionDateBs.slice(0, 4) : '2081';
      finalStudentId = `STU-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    }

    // Check unique username / studentId
    const existingUser = await prisma.user.findUnique({ where: { username: finalStudentId } });
    if (existingUser) {
      finalStudentId = `${finalStudentId}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const defaultPassword = generatePassword(8);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        username: finalStudentId,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentId: finalStudentId,
        fullName: String(fullName).trim(),
        fullNameNepali: fullNameNepali ? String(fullNameNepali).trim() : null,
        emisId: emisId ? String(emisId).trim() : null,
        gender: gender || null,
        dateOfBirthBs: dateOfBirthBs || null,
        dateOfBirthAd: dateOfBirthAd ? new Date(dateOfBirthAd) : null,
        admissionDateBs: admissionDateBs || null,
        batchYear: batchYear || (admissionDateBs ? admissionDateBs.slice(0, 4) : null),
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : null,
        fatherName: fatherName ? String(fatherName).trim() : null,
        motherName: motherName ? String(motherName).trim() : null,
        guardianName: guardianName ? String(guardianName).trim() : null,
        guardianContact: guardianContact ? String(guardianContact).trim() : null,
        guardianRelation: guardianRelation ? String(guardianRelation).trim() : null,
        previousSchool: previousSchool ? String(previousSchool).trim() : null,
        bloodGroup: bloodGroup || null,
        religion: religion || null,
        ethnicity: ethnicity || null,
        disability: disability || null,
        status: 'ACTIVE',
        isActive: true,
        collectedDocs: collectedDocs ? JSON.stringify(collectedDocs) : null,
      },
    });

    if (classId) {
      await prisma.classEnrollment.create({
        data: {
          studentId: student.id,
          classId: parseInt(classId),
          rollNo: rollNo ? parseInt(rollNo) : null,
          isActive: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...student,
        generatedPassword: defaultPassword,
      },
      message: `नयाँ विद्यार्थी भर्ना (Admission) सफलतापूर्वक सम्पन्न भयो! (Login ID: ${finalStudentId})`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/bulk-roll-setup — configure / re-sequence roll numbers for a class
router.post('/bulk-roll-setup', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { classId, mode, students } = req.body;
    if (!classId) return res.status(400).json({ success: false, message: 'Class ID is required.' });

    if (mode === 'ALPHABETICAL') {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: parseInt(classId), isActive: true },
        include: { student: { select: { fullName: true, emisId: true } } },
      });
      enrollments.sort((a, b) => {
        const nameA = (a.student?.fullName || '').trim().toLowerCase();
        const nameB = (b.student?.fullName || '').trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      for (let i = 0; i < enrollments.length; i++) {
        await prisma.classEnrollment.update({
          where: { id: enrollments[i].id },
          data: { rollNo: i + 1 },
        });
      }
      return res.json({ success: true, message: `कक्षाको रोल नम्बर वर्णानुक्रम अनुसार (1 देखि ${enrollments.length} सम्म) मिलाइयो!` });
    }

    if (Array.isArray(students)) {
      for (const item of students) {
        if (item.enrollmentId && item.rollNo !== undefined) {
          await prisma.classEnrollment.update({
            where: { id: parseInt(item.enrollmentId) },
            data: { rollNo: parseInt(item.rollNo) || null },
          });
        }
      }
      return res.json({ success: true, message: 'रोल नम्बर सफलतापूर्वक अद्यावधिक गरियो!' });
    }

    return res.status(400).json({ success: false, message: 'Invalid roll setup payload.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/bulk-edit — bulk edit student details
router.post('/bulk-edit', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { studentIds, updateData, targetClassId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one student.' });
    }

    const cleanUpdate = {};
    if (updateData?.address) cleanUpdate.address = String(updateData.address).trim();
    if (updateData?.bloodGroup) cleanUpdate.bloodGroup = updateData.bloodGroup;
    if (updateData?.status) cleanUpdate.status = updateData.status;

    if (Object.keys(cleanUpdate).length > 0) {
      await prisma.student.updateMany({
        where: { id: { in: studentIds.map(id => parseInt(id)) } },
        data: cleanUpdate,
      });
    }

    if (targetClassId) {
      for (const sId of studentIds) {
        await prisma.classEnrollment.updateMany({
          where: { studentId: parseInt(sId), isActive: true },
          data: { isActive: false },
        });
        await prisma.classEnrollment.create({
          data: {
            studentId: parseInt(sId),
            classId: parseInt(targetClassId),
            isActive: true,
          },
        });
      }
    }

    return res.json({ success: true, message: `${studentIds.length} जना विद्यार्थीहरूको विवरण एकमुष्ट अद्यावधिक भयो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/reset-password — instant password update/reset
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true },
    });
    if (!student || !student.user) return res.status(404).json({ success: false, message: 'Student user not found.' });

    const newPassword = req.body.newPassword || generatePassword(8);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return res.json({
      success: true,
      message: `विद्यार्थी (${student.fullName}) को पासवर्ड सफलतापूर्वक परिवर्तन भयो!`,
      newPassword,
      username: student.user.username,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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

