const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function getClassRank(name) {
  if (!name) return 999;
  const lower = name.toLowerCase().trim();
  if (lower.includes('play') || lower.includes('pg')) return -4;
  if (lower.includes('nursery') || lower.includes('shishu') || lower.includes('ecd')) return -3;
  if (lower.includes('lkg') || lower.includes('lower kg') || lower.includes('kg 1')) return -2;
  if (lower.includes('ukg') || lower.includes('upper kg') || lower.includes('kg 2') || lower.includes('kg')) return -1;

  const match = name.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 100;
}

// GET /api/classes
router.get('/', authenticate, async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = parseInt(academicYearId);
    let classes = await prisma.class.findMany({
      where,
      include: {
        classTeacher: { select: { id: true, fullName: true } },
        academicYear: { select: { id: true, year: true } },
        subjects: {
          include: {
            subject: true,
            teacher: { select: { id: true, fullName: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    // Natural Grade Sorting: Nursery -> LKG -> UKG -> Class 1 -> Class 2 -> ... -> Class 10 -> Class 11 -> Class 12
    classes.sort((a, b) => {
      const rankA = a.orderIndex !== 0 ? a.orderIndex : getClassRank(a.name);
      const rankB = b.orderIndex !== 0 ? b.orderIndex : getClassRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return (a.section || '').localeCompare(b.section || '');
    });

    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/classes/:id — with students
router.get('/:id', authenticate, async (req, res) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        classTeacher: true,
        academicYear: true,
        subjects: { include: { subject: true, teacher: { select: { id: true, fullName: true } } } },
        enrollments: {
          where: { isActive: true },
          include: { student: { select: { id: true, fullName: true, studentId: true, gender: true, photoUrl: true } } },
          orderBy: { rollNo: 'asc' },
        },
      },
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    return res.json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const calcOrderIndex = (req.body.orderIndex !== undefined && req.body.orderIndex !== null && req.body.orderIndex !== '')
      ? parseInt(req.body.orderIndex)
      : getClassRank(req.body.name);

    const cls = await prisma.class.create({
      data: {
        name: req.body.name,
        nameNepali: req.body.nameNepali,
        section: req.body.section,
        classTeacherId: req.body.classTeacherId ? parseInt(req.body.classTeacherId) : null,
        academicYearId: parseInt(req.body.academicYearId),
        orderIndex: calcOrderIndex,
      },
    });
    return res.status(201).json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/classes/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const cls = await prisma.class.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: req.body.name,
        nameNepali: req.body.nameNepali,
        section: req.body.section,
        classTeacherId: req.body.classTeacherId ? parseInt(req.body.classTeacherId) : null,
        orderIndex: req.body.orderIndex !== undefined ? parseInt(req.body.orderIndex) : undefined,
      },
    });
    return res.json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    await prisma.$transaction([
      prisma.classSubject.deleteMany({ where: { classId } }),
      prisma.classEnrollment.deleteMany({ where: { classId } }),
      prisma.attendance.deleteMany({ where: { classId } }),
      prisma.class.delete({ where: { id: classId } }),
    ]);
    return res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/:id/enroll — assign student to class
router.post('/:id/enroll', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { studentId, rollNo } = req.body;
    // Deactivate any existing enrollment
    await prisma.classEnrollment.updateMany({
      where: { studentId: parseInt(studentId), isActive: true },
      data: { isActive: false },
    });
    const enrollment = await prisma.classEnrollment.create({
      data: {
        studentId: parseInt(studentId),
        classId: parseInt(req.params.id),
        rollNo: rollNo ? parseInt(rollNo) : null,
        isActive: true,
      },
    });
    return res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/:id/auto-roll-numbers — Assign sequential Roll Numbers 1, 2, 3... alphabetically by student name
router.post('/:id/auto-roll-numbers', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, emisId: true } } },
    });

    // Sort alphabetically by full name (A to Z)
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

    return res.json({
      success: true,
      count: enrollments.length,
      message: `Assigned alphabetical roll numbers (1 to ${enrollments.length}) for this class.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/auto-roll-numbers/all — Assign alphabetical roll numbers across ALL classes
router.post('/auto-roll-numbers/all', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classes = await prisma.class.findMany();
    let totalUpdated = 0;

    for (const cls of classes) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: cls.id, isActive: true },
        include: { student: { select: { id: true, fullName: true, emisId: true } } },
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
        totalUpdated++;
      }
    }

    return res.json({
      success: true,
      totalUpdated,
      message: `Alphabetical roll numbers assigned across all classes (${totalUpdated} students updated).`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── SUBJECTS ──────────────────────────────────────────────────────────────

// Complete Nepal Curriculum Subject Catalog (Nursery to Class 12)
const ALL_CURRICULUM_SUBJECTS = [
  // ECD / Nursery / KG
  { code: 'ECD-ENG', name: 'English Rhymes & Language', nameNepali: 'अंग्रेजी भाषा र बालगीत', isElective: false },
  { code: 'ECD-NEP', name: 'Nepali Akshar Gyan', nameNepali: 'नेपाली भाषा र अक्षर ज्ञान', isElective: false },
  { code: 'ECD-MATH', name: 'Mathematics & Number Fun', nameNepali: 'गणित र अङ्क ज्ञान', isElective: false },
  { code: 'ECD-THEME', name: 'Creative Activities & Theme', nameNepali: 'सिर्जनात्मक क्रियाकलाप', isElective: false },
  { code: 'ECD-ART', name: 'Drawing, Art & Craft', nameNepali: 'चित्रकला तथा हस्तकला', isElective: false },
  { code: 'ECD-GK', name: 'General Awareness', nameNepali: 'सामान्य ज्ञान तथा असल बानी', isElective: false },

  // Grades 1-3 (Integrated Curriculum)
  { code: 'NEP-101', name: 'Nepali (Grade 1-3)', nameNepali: 'नेपाली (कक्षा १-३)', isElective: false },
  { code: 'ENG-101', name: 'English (Grade 1-3)', nameNepali: 'अंग्रेजी (कक्षा १-३)', isElective: false },
  { code: 'MTH-101', name: 'Mathematics (Grade 1-3)', nameNepali: 'गणित (कक्षा १-३)', isElective: false },
  { code: 'SER-101', name: 'Hamro Serophero', nameNepali: 'हाम्रो सेरोफेरो (कक्षा १-३)', isElective: false },
  { code: 'LOC-101', name: 'Local Subject / Mother Tongue', nameNepali: 'मातृभाषा / स्थानीय विषय', isElective: false },

  // Grades 4-5
  { code: 'NEP-401', name: 'Nepali (Grade 4-5)', nameNepali: 'नेपाली (कक्षा ४-५)', isElective: false },
  { code: 'ENG-401', name: 'English (Grade 4-5)', nameNepali: 'अंग्रेजी (कक्षा ४-५)', isElective: false },
  { code: 'MTH-401', name: 'Mathematics (Grade 4-5)', nameNepali: 'गणित (कक्षा ४-५)', isElective: false },
  { code: 'SCI-401', name: 'Science & Technology (Grade 4-5)', nameNepali: 'विज्ञान तथा प्रविधि (कक्षा ४-५)', isElective: false },
  { code: 'SOC-401', name: 'Social Studies & Human Values (Grade 4-5)', nameNepali: 'सामाजिक अध्ययन तथा मानव मूल्य (४-५)', isElective: false },
  { code: 'HPE-401', name: 'Health, Physical & Creative Arts (4-5)', nameNepali: 'स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला', isElective: false },

  // Grades 6-8 (BLE / Basic Education)
  { code: 'NEP-601', name: 'Compulsory Nepali (Grade 6-8)', nameNepali: 'अनिवार्य नेपाली (कक्षा ६-८)', isElective: false },
  { code: 'ENG-601', name: 'Compulsory English (Grade 6-8)', nameNepali: 'अनिवार्य अंग्रेजी (कक्षा ६-८)', isElective: false },
  { code: 'MTH-601', name: 'Compulsory Mathematics (Grade 6-8)', nameNepali: 'अनिवार्य गणित (कक्षा ६-८)', isElective: false },
  { code: 'SCI-601', name: 'Science & Technology (Grade 6-8)', nameNepali: 'विज्ञान तथा प्रविधि (कक्षा ६-८)', isElective: false },
  { code: 'SOC-601', name: 'Social Studies & Human Values (6-8)', nameNepali: 'सामाजिक अध्ययन तथा मानव मूल्य (६-८)', isElective: false },
  { code: 'HPE-601', name: 'Health & Physical Education (6-8)', nameNepali: 'स्वास्थ्य तथा शारीरिक शिक्षा (६-८)', isElective: false },
  { code: 'OBT-601', name: 'Local Subject / OBT (Grade 6-8)', nameNepali: 'स्थानीय विषय / पेसा र प्रविधि (६-८)', isElective: false },
  { code: 'MOR-601', name: 'Moral Education', nameNepali: 'नैतिक शिक्षा', isElective: false },
  { code: 'COM-601', name: 'Computer Education (Grade 6-8)', nameNepali: 'कम्प्युटर शिक्षा (कक्षा ६-८)', isElective: false },

  // Grades 9-10 (SEE)
  { code: 'NEP-001', name: 'Compulsory Nepali (Grade 9-10)', nameNepali: 'अनिवार्य नेपाली (कक्षा ९-१०)', isElective: false },
  { code: 'ENG-002', name: 'Compulsory English (Grade 9-10)', nameNepali: 'अनिवार्य अंग्रेजी (कक्षा ९-१०)', isElective: false },
  { code: 'MTH-003', name: 'Compulsory Mathematics (Grade 9-10)', nameNepali: 'अनिवार्य गणित (कक्षा ९-१०)', isElective: false },
  { code: 'SCI-004', name: 'Science & Technology (Grade 9-10)', nameNepali: 'विज्ञान तथा प्रविधि (कक्षा ९-१०)', isElective: false },
  { code: 'SOC-005', name: 'Social Studies (Grade 9-10)', nameNepali: 'सामाजिक अध्ययन (कक्षा ९-१०)', isElective: false },
  { code: 'OPT-MTH-101', name: 'Optional Mathematics (Grade 9-10)', nameNepali: 'ऐच्छिक प्रथम: गणित', isElective: true },
  { code: 'OPT-ECO-102', name: 'Optional Economics (Grade 9-10)', nameNepali: 'ऐच्छिक प्रथम: अर्थशास्त्र', code: 'OPT-ECO-102', isElective: true },
  { code: 'OPT-COM-201', name: 'Computer Science (Grade 9-10)', nameNepali: 'ऐच्छिक द्वितीय: कम्प्युटर विज्ञान', isElective: true },
  { code: 'OPT-ACC-202', name: 'Accountancy & Office Management', nameNepali: 'ऐच्छिक द्वितीय: लेखाशास्त्र', isElective: true },
  { code: 'OPT-HPE-203', name: 'Health & Physical Education (9-10)', nameNepali: 'ऐच्छिक द्वितीय: स्वास्थ्य तथा शारीरिक', isElective: true },
  { code: 'OPT-AGR-204', name: 'Agriculture & Technical Studies', nameNepali: 'ऐच्छिक द्वितीय: कृषि तथा प्राविधिक', isElective: true },

  // Grades 11-12 (NEB Compulsory)
  { code: 'NEP-0011', name: 'Compulsory Nepali (Grade 11/12)', nameNepali: 'अनिवार्य नेपाली (कक्षा ११/१२)', isElective: false },
  { code: 'ENG-0021', name: 'Compulsory English (Grade 11/12)', nameNepali: 'अनिवार्य अंग्रेजी (कक्षा ११/१२)', isElective: false },
  { code: 'SOC-0031', name: 'Social Studies & Life Skills (11/12)', nameNepali: 'सामाजिक अध्ययन तथा जीवनोपयोगी शिक्षा', isElective: false },

  // Grades 11-12 (Science Stream)
  { code: 'PHY-101', name: 'Physics (Grade 11/12)', nameNepali: 'भौतिकशास्त्र (Physics)', isElective: false },
  { code: 'CHE-102', name: 'Chemistry (Grade 11/12)', nameNepali: 'रसायनशास्त्र (Chemistry)', isElective: false },
  { code: 'BIO-103', name: 'Biology (Grade 11/12)', nameNepali: 'जीवविज्ञान (Biology)', isElective: true },
  { code: 'MTH-104', name: 'Mathematics (Grade 11/12)', nameNepali: 'गणित (Mathematics)', isElective: false },
  { code: 'COM-105', name: 'Computer Science (Grade 11/12)', nameNepali: 'कम्प्युटर विज्ञान (Computer Science)', isElective: true },

  // Grades 11-12 (Management Stream)
  { code: 'ACC-201', name: 'Principles of Accounting (11/12)', nameNepali: 'लेखाविधिका सिद्धान्त (Accounting)', isElective: false },
  { code: 'ECO-202', name: 'Economics (Grade 11/12)', nameNepali: 'अर्थशास्त्र (Economics)', isElective: false },
  { code: 'BUS-203', name: 'Business Studies (Grade 11/12)', nameNepali: 'व्यावसायिक अध्ययन (Business Studies)', isElective: false },
  { code: 'HM-204', name: 'Hotel Management (Grade 11/12)', nameNepali: 'होटल व्यवस्थापन (Hotel Management)', isElective: true },
  { code: 'BMTH-205', name: 'Business Mathematics (11/12)', nameNepali: 'व्यावसायिक गणित (Business Math)', isElective: true },
  { code: 'MKT-206', name: 'Marketing (Grade 11/12)', nameNepali: 'बजारशास्त्र (Marketing)', isElective: true },
];

const CURRICULUM_PRESETS = {
  ECD: {
    label: 'प्रारम्भिक बालविकास (ECD / Nursery / KG)',
    codes: ['ECD-ENG', 'ECD-NEP', 'ECD-MATH', 'ECD-THEME', 'ECD-ART', 'ECD-GK'],
  },
  PRIMARY_1_3: {
    label: 'कक्षा १ - ३ (एकीकृत पाठ्यक्रम / Integrated)',
    codes: ['NEP-101', 'ENG-101', 'MTH-101', 'SER-101', 'LOC-101'],
  },
  PRIMARY_4_5: {
    label: 'कक्षा ४ - ५ (Primary Level)',
    codes: ['NEP-401', 'ENG-401', 'MTH-401', 'SCI-401', 'SOC-401', 'HPE-401'],
  },
  BASIC_6_8: {
    label: 'कक्षा ६ - ८ (आधारभूत तह / BLE)',
    codes: ['NEP-601', 'ENG-601', 'MTH-601', 'SCI-601', 'SOC-601', 'HPE-601', 'OBT-601', 'COM-601'],
  },
  SEE_9_10_GEN: {
    label: 'कक्षा ९ - १० (SEE Compulsory + Opt Math & Comp)',
    codes: ['NEP-001', 'ENG-002', 'MTH-003', 'SCI-004', 'SOC-005', 'OPT-MTH-101', 'OPT-COM-201'],
  },
  SEE_9_10_MGMT: {
    label: 'कक्षा ९ - १० (SEE Compulsory + Opt Eco & Account)',
    codes: ['NEP-001', 'ENG-002', 'MTH-003', 'SCI-004', 'SOC-005', 'OPT-ECO-102', 'OPT-ACC-202'],
  },
  NEB_11_12_SCI: {
    label: 'कक्षा ११ - १२ (Science Stream - NEB)',
    codes: ['NEP-0011', 'ENG-0021', 'SOC-0031', 'PHY-101', 'CHE-102', 'BIO-103', 'MTH-104'],
  },
  NEB_11_12_MGMT: {
    label: 'कक्षा ११ - १२ (Management Stream - NEB)',
    codes: ['NEP-0011', 'ENG-0021', 'SOC-0031', 'ACC-201', 'ECO-202', 'BUS-203', 'HM-204'],
  },
};

router.get('/subjects/presets', authenticate, async (req, res) => {
  return res.json({ success: true, data: CURRICULUM_PRESETS });
});

router.get('/subjects/all', authenticate, async (req, res) => {
  let subjects = await prisma.subject.findMany({ orderBy: { id: 'asc' } });
  
  // Auto-seed if subject catalog is sparse
  if (subjects.length < 20) {
    for (const s of ALL_CURRICULUM_SUBJECTS) {
      const existing = await prisma.subject.findFirst({ where: { code: s.code } });
      if (!existing) {
        await prisma.subject.create({ data: s });
      }
    }
    subjects = await prisma.subject.findMany({ orderBy: { id: 'asc' } });
  }
  return res.json({ success: true, data: subjects });
});

router.post('/subjects', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const sub = await prisma.subject.create({ data: req.body });
    return res.status(201).json({ success: true, data: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/classes/subjects/:id — Edit a subject in catalog
router.put('/subjects/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const sub = await prisma.subject.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: req.body.name,
        nameNepali: req.body.nameNepali,
        code: req.body.code,
        isElective: req.body.isElective === true || req.body.isElective === 'true',
      },
    });
    return res.json({ success: true, data: sub, message: 'Subject updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classes/subjects/:id — Delete a subject from catalog
router.delete('/subjects/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const subjectId = parseInt(req.params.id);
    // Delete related classSubject records first
    await prisma.classSubject.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    return res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/:id/subjects/apply-preset — assign whole curriculum preset with on-the-fly subject creation
router.post('/:id/subjects/apply-preset', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { presetKey } = req.body;
    const preset = CURRICULUM_PRESETS[presetKey];
    if (!preset) {
      return res.status(400).json({ success: false, message: 'Invalid preset key.' });
    }

    const matchedSubjects = [];
    for (const code of preset.codes) {
      let sub = await prisma.subject.findFirst({ where: { code } });
      if (!sub) {
        const catalogItem = ALL_CURRICULUM_SUBJECTS.find(c => c.code === code);
        if (catalogItem) {
          sub = await prisma.subject.create({ data: catalogItem });
        }
      }
      if (sub) {
        matchedSubjects.push(sub);
      }
    }

    if (matchedSubjects.length === 0) {
      return res.status(400).json({ success: false, message: 'No subjects found matching this preset.' });
    }

    await prisma.classSubject.deleteMany({ where: { classId: parseInt(req.params.id) } });
    await prisma.classSubject.createMany({
      data: matchedSubjects.map(s => ({
        classId: parseInt(req.params.id),
        subjectId: s.id,
      })),
    });

    return res.json({
      success: true,
      count: matchedSubjects.length,
      message: `Assigned ${matchedSubjects.length} subjects from "${preset.label}" to class.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/:id/subjects/add-single — Add an individual subject to a class
router.post('/:id/subjects/add-single', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const subjectId = parseInt(req.body.subjectId);
    const teacherId = req.body.teacherId ? parseInt(req.body.teacherId) : null;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required.' });
    }

    // Check if already assigned
    const existing = await prisma.classSubject.findFirst({
      where: { classId, subjectId },
    });

    if (existing) {
      const updated = await prisma.classSubject.update({
        where: { id: existing.id },
        data: { teacherId },
      });
      return res.json({ success: true, data: updated, message: 'Subject teacher updated.' });
    }

    const created = await prisma.classSubject.create({
      data: { classId, subjectId, teacherId },
    });
    return res.status(201).json({ success: true, data: created, message: 'Subject added to class.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classes/:id/subjects/:subjectId — Remove a specific subject from a class
router.delete('/:id/subjects/:subjectId', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const subjectId = parseInt(req.params.subjectId);
    await prisma.classSubject.deleteMany({
      where: { classId, subjectId },
    });
    return res.json({ success: true, message: 'Subject removed from class.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/classes/:id/subjects/:subjectId/teacher — Update assigned teacher for a class subject
router.patch('/:id/subjects/:subjectId/teacher', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const subjectId = parseInt(req.params.subjectId);
    const teacherId = req.body.teacherId ? parseInt(req.body.teacherId) : null;

    const existing = await prisma.classSubject.findFirst({
      where: { classId, subjectId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subject not assigned to this class.' });
    }

    const updated = await prisma.classSubject.update({
      where: { id: existing.id },
      data: { teacherId },
    });
    return res.json({ success: true, data: updated, message: 'Teacher assignment updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classes/:id/subjects — bulk assign subjects to class
router.post('/:id/subjects', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { subjects } = req.body; // [{ subjectId, teacherId }]
    await prisma.classSubject.deleteMany({ where: { classId: parseInt(req.params.id) } });
    const created = await prisma.classSubject.createMany({
      data: subjects.map(s => ({
        classId: parseInt(req.params.id),
        subjectId: s.subjectId,
        teacherId: s.teacherId || null,
      })),
    });
    return res.json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── ACADEMIC YEARS ────────────────────────────────────────────────────────

router.get('/academic-years/all', authenticate, async (req, res) => {
  const years = await prisma.academicYear.findMany({ orderBy: { year: 'desc' } });
  return res.json({ success: true, data: years });
});

router.post('/academic-years', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (req.body.isActive) {
      await prisma.academicYear.updateMany({ data: { isActive: false } });
    }
    const yr = await prisma.academicYear.create({ data: req.body });
    return res.status(201).json({ success: true, data: yr });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/academic-years/:id/activate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.academicYear.updateMany({ data: { isActive: false } });
    const yr = await prisma.academicYear.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: true },
    });
    return res.json({ success: true, data: yr });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/academic-years/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const yearId = parseInt(req.params.id);
    const yr = await prisma.academicYear.findUnique({ where: { id: yearId } });
    if (!yr) return res.status(404).json({ success: false, message: 'Academic Year not found.' });

    // Check if linked data exists
    const [expenseCount, incomeCount, feeCount, classCount] = await Promise.all([
      prisma.expenseEntry.count({ where: { academicYearId: yearId } }),
      prisma.incomeEntry.count({ where: { academicYearId: yearId } }),
      prisma.feeCollection.count({ where: { academicYearId: yearId } }),
      prisma.class.count({ where: { academicYearId: yearId } }),
    ]);

    if (expenseCount > 0 || incomeCount > 0 || feeCount > 0 || classCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Academic Year "${yr.year}" because it has linked transactions or classes. Delete or reassign those records first.`
      });
    }

    await prisma.academicYear.delete({ where: { id: yearId } });
    return res.json({ success: true, message: `Academic Year "${yr.year}" deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
