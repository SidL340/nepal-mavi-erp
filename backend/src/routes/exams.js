const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── EXAMS ─────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const { academicYearId } = req.query;
  const where = {};
  if (academicYearId) where.academicYearId = parseInt(academicYearId);
  const exams = await prisma.exam.findMany({
    where,
    include: { academicYear: true, examClasses: { include: { class: true } } },
    orderBy: { startDateBs: 'asc' },
  });
  return res.json({ success: true, data: exams });
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { classIds, name, nameNepali, startDateBs, endDateBs, shift, examTiming, academicYearId } = req.body;
    const exam = await prisma.exam.create({
      data: {
        name,
        nameNepali,
        startDateBs,
        endDateBs,
        shift: shift || 'DAY',
        examTiming: examTiming || null,
        academicYearId: parseInt(academicYearId),
        examClasses: classIds && Array.isArray(classIds) ? {
          create: classIds.map(cid => ({ classId: parseInt(cid) })),
        } : undefined,
      },
      include: { academicYear: true, examClasses: { include: { class: true } } },
    });
    return res.status(201).json({ success: true, data: exam, message: 'Exam created successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { classIds, name, nameNepali, startDateBs, endDateBs, shift, examTiming, academicYearId } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali;
    if (startDateBs !== undefined) updateData.startDateBs = startDateBs;
    if (endDateBs !== undefined) updateData.endDateBs = endDateBs;
    if (shift !== undefined) updateData.shift = shift;
    if (examTiming !== undefined) updateData.examTiming = examTiming;
    if (academicYearId !== undefined) updateData.academicYearId = parseInt(academicYearId);

    await prisma.exam.update({
      where: { id: examId },
      data: updateData,
    });

    if (classIds && Array.isArray(classIds)) {
      await prisma.examClass.deleteMany({ where: { examId } });
      await prisma.examClass.createMany({
        data: classIds.map(cid => ({ examId, classId: parseInt(cid) })),
      });
    }

    const updated = await prisma.exam.findUnique({
      where: { id: examId },
      include: { academicYear: true, examClasses: { include: { class: true } } },
    });

    return res.json({ success: true, data: updated, message: 'Exam details updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    const examSubjects = await prisma.examSubject.findMany({ where: { examId } });
    const esIds = examSubjects.map(es => es.id);

    await prisma.markEntry.deleteMany({ where: { examSubjectId: { in: esIds } } });
    await prisma.markTitle.deleteMany({ where: { examSubjectId: { in: esIds } } });
    await prisma.examSubject.deleteMany({ where: { examId } });
    await prisma.examClass.deleteMany({ where: { examId } });
    await prisma.exam.delete({ where: { id: examId } });

    return res.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── EXAM SUBJECTS & MARK TITLES ───────────────────────────────────────────

// GET /api/exams/:examId/subjects — subjects for exam with mark titles
router.get('/:examId/subjects', authenticate, async (req, res) => {
  const subjects = await prisma.examSubject.findMany({
    where: { examId: parseInt(req.params.examId) },
    include: { subject: true, markTitles: { orderBy: { orderIndex: 'asc' } } },
  });
  return res.json({ success: true, data: subjects });
});

// POST /api/exams/:examId/subjects — add subject to exam with mark titles
router.post('/:examId/subjects', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { subjectId, markTitles } = req.body;
    const es = await prisma.examSubject.create({
      data: {
        examId: parseInt(req.params.examId),
        subjectId: parseInt(subjectId),
        markTitles: {
          create: (markTitles || []).map((mt, idx) => ({
            title: mt.title,
            fullMark: parseFloat(mt.fullMark),
            passMarkPct: parseFloat(mt.passMarkPct || 40),
            orderIndex: idx,
          })),
        },
      },
      include: { subject: true, markTitles: true },
    });
    return res.status(201).json({ success: true, data: es });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/exams/:examId/subjects/configure — Subject teacher or admin creates/updates mark breakdown parts
router.post('/:examId/subjects/configure', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const { subjectId, markTitles } = req.body;
    const sId = parseInt(subjectId);

    if (!markTitles || !Array.isArray(markTitles) || markTitles.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one mark component.' });
    }

    // Permission check: Admin or assigned Subject Teacher
    if (req.user.role === 'TEACHER') {
      const teacherId = req.user.teacher?.id;
      if (!teacherId) return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });

      const isAssigned = await prisma.classSubject.findFirst({
        where: { subjectId: sId, teacherId },
      }) || await prisma.teacherSubject.findFirst({
        where: { subjectId: sId, teacherId },
      });

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Permission Denied: Only the assigned Subject Teacher can configure mark breakdown for this subject.',
        });
      }
    }

    // Find or create ExamSubject
    let examSubject = await prisma.examSubject.findFirst({
      where: { examId, subjectId: sId },
      include: { markTitles: true },
    });

    if (!examSubject) {
      examSubject = await prisma.examSubject.create({
        data: {
          examId,
          subjectId: sId,
        },
      });
    }

    // Delete existing mark titles with no mark entries, or safely replace
    await prisma.markTitle.deleteMany({
      where: { examSubjectId: examSubject.id },
    });

    // Create new mark titles
    await Promise.all(
      markTitles.map((mt, idx) =>
        prisma.markTitle.create({
          data: {
            examSubjectId: examSubject.id,
            title: mt.title || `Part ${idx + 1}`,
            fullMark: parseFloat(mt.fullMark || 0),
            rawFullMark: mt.rawFullMark ? parseFloat(mt.rawFullMark) : null,
            passMarkPct: parseFloat(mt.passMarkPct || 40),
            orderIndex: idx,
          },
        })
      )
    );

    const updated = await prisma.examSubject.findUnique({
      where: { id: examSubject.id },
      include: { subject: true, markTitles: { orderBy: { orderIndex: 'asc' } } },
    });

    return res.json({ success: true, data: updated, message: 'Mark breakdown components saved successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to generate automatic Symbol No: AcademicYear (e.g. 2083) + Class (2 digits) + Roll No (2+ digits)
// Example: Year 2083, Class 1, Roll No 60 => 20830160
function generateSymbolNo(yearName, className, rollNo) {
  const yearMatch = (yearName || '2083').toString().match(/\d{4}/);
  const yearStr = yearMatch ? yearMatch[0] : '2083';

  let classNum = '00';
  const classMatch = (className || '').toString().match(/\d+/);
  if (classMatch) {
    classNum = classMatch[0].padStart(2, '0');
  } else if (/ecd|ppc|nursery/i.test(className || '')) {
    classNum = '00';
  }

  const rollStr = (rollNo || 0).toString().padStart(2, '0');
  return `${yearStr}${classNum}${rollStr}`;
}

// ── MARK ENTRY ────────────────────────────────────────────────────────────

// GET /api/exams/:examId/marks?classId=&subjectId=
router.get('/:examId/marks', authenticate, async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) {
      return res.json({ success: true, data: { examSubject: null, students: [] } });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(req.params.examId) },
      include: { academicYear: true },
    });
    const cls = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
    });

    const yearName = exam?.academicYear?.year || '2083';
    const className = cls?.name || `Class ${classId}`;

    // Get exam subject
    const examSubject = await prisma.examSubject.findFirst({
      where: { examId: parseInt(req.params.examId), subjectId: parseInt(subjectId) },
      include: { markTitles: { orderBy: { orderIndex: 'asc' } }, subject: true },
    });

    // Get students in class
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: parseInt(classId), isActive: true },
      include: { student: { select: { id: true, fullName: true, studentId: true } } },
      orderBy: { rollNo: 'asc' },
    });

    const marksMap = {};
    if (examSubject) {
      const marks = await prisma.markEntry.findMany({
        where: {
          examSubjectId: examSubject.id,
          studentId: { in: enrollments.map(e => e.studentId) },
        },
      });
      marks.forEach(m => {
        if (!marksMap[m.studentId]) marksMap[m.studentId] = {};
        marksMap[m.studentId][m.markTitleId] = m;
      });
    }

    return res.json({
      success: true,
      data: {
        examSubject: examSubject || null,
        students: enrollments.map(e => ({
          ...e.student,
          rollNo: e.rollNo,
          symbolNo: generateSymbolNo(yearName, className, e.rollNo),
          marks: marksMap[e.studentId] || {},
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/exams/:examId/marks — bulk save marks
router.post('/:examId/marks', authenticate, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No mark entries provided.' });
    }

    // Strict Permission: Only Assigned Subject Teacher or ADMIN can enter marks
    if (req.user.role === 'TEACHER') {
      const teacherId = req.user.teacher?.id;
      if (!teacherId) {
        return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
      }
      const firstEntry = entries[0];
      const examSub = await prisma.examSubject.findUnique({
        where: { id: parseInt(firstEntry.examSubjectId) },
        include: { subject: true },
      });
      if (examSub) {
        const isAssigned = await prisma.classSubject.findFirst({
          where: {
            subjectId: examSub.subjectId,
            teacherId,
          },
        }) || await prisma.teacherSubject.findFirst({
          where: {
            subjectId: examSub.subjectId,
            teacherId,
          },
        });

        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            message: `Permission Denied: Only the assigned Subject Teacher for "${examSub.subject?.name}" can enter marks.`,
          });
        }
      }
    }

    const results = [];
    for (const entry of entries) {
      const saved = await prisma.markEntry.upsert({
        where: {
          examSubjectId_markTitleId_studentId: {
            examSubjectId: entry.examSubjectId,
            markTitleId: entry.markTitleId,
            studentId: entry.studentId,
          },
        },
        update: {
          marksObtained: entry.marksObtained !== undefined ? (entry.marksObtained !== null ? parseFloat(entry.marksObtained) : null) : null,
          isAbsent: entry.isAbsent || false,
          remark: entry.remark,
          teacherId: req.user.teacher?.id || null,
        },
        create: {
          examSubjectId: entry.examSubjectId,
          markTitleId: entry.markTitleId,
          studentId: entry.studentId,
          marksObtained: entry.marksObtained !== undefined ? (entry.marksObtained !== null ? parseFloat(entry.marksObtained) : null) : null,
          isAbsent: entry.isAbsent || false,
          remark: entry.remark,
          teacherId: req.user.teacher?.id || null,
        },
      });
      results.push(saved);
    }
    return res.json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

function calculateGradeDetails(pct) {
  const p = parseFloat(pct || 0);
  if (p >= 90) return { letterGrade: 'A+', gradePoint: 4.0, remarks: 'Outstanding (सर्वोत्कृष्ट)' };
  if (p >= 80) return { letterGrade: 'A', gradePoint: 3.6, remarks: 'Excellent (उत्कृष्ट)' };
  if (p >= 70) return { letterGrade: 'B+', gradePoint: 3.2, remarks: 'Very Good (धेरै राम्रो)' };
  if (p >= 60) return { letterGrade: 'B', gradePoint: 2.8, remarks: 'Good (राम्रो)' };
  if (p >= 50) return { letterGrade: 'C+', gradePoint: 2.4, remarks: 'Satisfactory (सन्तोषजनक)' };
  if (p >= 40) return { letterGrade: 'C', gradePoint: 2.0, remarks: 'Acceptable (ग्राह्य)' };
  if (p >= 35) return { letterGrade: 'D', gradePoint: 1.6, remarks: 'Basic (आधारभूत)' };
  return { letterGrade: 'NG', gradePoint: 0.0, remarks: 'Non-Graded (अवर्गीकृत)' };
}

function getOverallGradeFromGpa(gpa) {
  const g = parseFloat(gpa || 0);
  if (g >= 3.6) return { letterGrade: 'A+', remarks: 'Outstanding (सर्वोत्कृष्ट)' };
  if (g >= 3.2) return { letterGrade: 'A', remarks: 'Excellent (उत्कृष्ट)' };
  if (g >= 2.8) return { letterGrade: 'B+', remarks: 'Very Good (धेरै राम्रो)' };
  if (g >= 2.4) return { letterGrade: 'B', remarks: 'Good (राम्रो)' };
  if (g >= 2.0) return { letterGrade: 'C+', remarks: 'Satisfactory (सन्तोषजनक)' };
  if (g >= 1.6) return { letterGrade: 'C', remarks: 'Acceptable (ग्राह्य)' };
  if (g >= 1.2) return { letterGrade: 'D', remarks: 'Basic (आधारभूत)' };
  return { letterGrade: 'NG', remarks: 'Non-Graded (अवर्गीकृत)' };
}

// POST /api/exams/:id/publish-result
router.post('/:id/publish-result', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { classIds, isPublished = true } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { examClasses: { include: { class: true } } },
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const whereClass = { examId };
    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      whereClass.classId = { in: classIds.map(id => parseInt(id)) };
    }

    await prisma.examClass.updateMany({
      where: whereClass,
      data: { isPublished: Boolean(isPublished), publishedAt: isPublished ? new Date() : null },
    });

    if (isPublished) {
      const targetClassIds = classIds && Array.isArray(classIds) && classIds.length > 0
        ? classIds.map(id => parseInt(id))
        : exam.examClasses.map(ec => ec.classId);

      for (const cid of targetClassIds) {
        const cls = await prisma.class.findUnique({ where: { id: cid } });
        await prisma.notice.create({
          data: {
            title: `📢 Exam Results Published: ${exam.name} (${cls?.name || 'Class'})`,
            body: `Official examination results for ${exam.name} (${cls?.name || 'Class'}) have been published by school administration. You can now view and print your Grade Sheet from your Student Portal!`,
            type: 'GENERAL',
            targetClassId: cid,
            postedDateBs: '2081-05-15',
            createdBy: req.user.id,
          },
        });
      }

      await prisma.notice.create({
        data: {
          title: `📢 Exam Results Published: ${exam.name}`,
          body: `Official examination results for ${exam.name} have been published by administration. Students can view and print their Grade Sheets from the Student Portal.`,
          type: 'GENERAL',
          targetRole: 'STUDENT',
          postedDateBs: '2081-05-15',
          createdBy: req.user.id,
        },
      });
    }

    return res.json({
      success: true,
      message: isPublished ? `Results for ${exam.name} published successfully!` : `Results status updated.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/exams/:examId/marksheet/:studentId
router.get('/:examId/marksheet/:studentId', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const studentId = parseInt(req.params.studentId);

    const school = await prisma.school.findFirst();
    const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { academicYear: true } });
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { classEnrollment: { where: { isActive: true }, include: { class: true } } },
    });

    const activeEnrollment = student?.classEnrollment?.find(ce => ce.isActive);

    // If request comes from a STUDENT, verify result publication for their class
    if (req.user.role === 'STUDENT' && activeEnrollment) {
      const examClass = await prisma.examClass.findFirst({
        where: { examId, classId: activeEnrollment.classId },
      });
      if (!examClass || !examClass.isPublished) {
        return res.json({
          success: true,
          data: {
            isPublished: false,
            message: `Results for "${exam?.name || 'this exam'}" have not been published by administration yet.`,
          },
        });
      }
    }
    const yearName = exam?.academicYear?.year || '2083';
    const className = activeEnrollment?.class?.name || '';
    const rollNo = activeEnrollment?.rollNo || 1;
    const symbolNo = generateSymbolNo(yearName, className, rollNo);

    const examSubjects = await prisma.examSubject.findMany({
      where: { examId },
      include: {
        subject: true,
        markTitles: { orderBy: { orderIndex: 'asc' } },
        markEntries: { where: { studentId } },
      },
    });

    // Build comprehensive GPA & Grade Sheet data
    const subjectResults = examSubjects.map(es => {
      const titleResults = (es.markTitles || []).map(mt => {
        const entry = es.markEntries?.find(me => me.markTitleId === mt.id);
        const fullMark = mt.fullMark || 0;
        const obtained = entry?.marksObtained !== null && entry?.marksObtained !== undefined ? entry.marksObtained : null;
        const isAbsent = entry?.isAbsent || false;
        const pct = fullMark > 0 ? (obtained !== null ? +((obtained / fullMark) * 100).toFixed(2) : 0) : 0;
        const gradeInfo = calculateGradeDetails(pct);

        return {
          id: mt.id,
          title: mt.title,
          fullMark,
          rawFullMark: mt.rawFullMark,
          passMark: Math.ceil((fullMark * (mt.passMarkPct || 40)) / 100),
          obtained,
          isAbsent,
          percentage: pct,
          letterGrade: isAbsent ? 'ABS' : gradeInfo.letterGrade,
          gradePoint: isAbsent ? 0.0 : gradeInfo.gradePoint,
        };
      });

      // Split Theory vs Practical/Internal
      const thTitles = titleResults.filter(t => /theory|सैद्धान्तिक|written/i.test(t.title));
      const prTitles = titleResults.filter(t => !/theory|सैद्धान्तिक|written/i.test(t.title));

      const thFull = thTitles.reduce((s, t) => s + t.fullMark, 0);
      const thObtained = thTitles.reduce((s, t) => s + (t.obtained ?? 0), 0);
      const thPct = thFull > 0 ? +((thObtained / thFull) * 100).toFixed(2) : 0;
      const thGrade = thFull > 0 ? calculateGradeDetails(thPct) : null;

      const prFull = prTitles.reduce((s, t) => s + t.fullMark, 0);
      const prObtained = prTitles.reduce((s, t) => s + (t.obtained ?? 0), 0);
      const prPct = prFull > 0 ? +((prObtained / prFull) * 100).toFixed(2) : 0;
      const prGrade = prFull > 0 ? calculateGradeDetails(prPct) : null;

      const totalFull = titleResults.reduce((s, t) => s + t.fullMark, 0);
      const totalObtained = titleResults.reduce((s, t) => s + (t.obtained ?? 0), 0);
      const percentage = totalFull > 0 ? +((totalObtained / totalFull) * 100).toFixed(2) : 0;
      const finalGradeInfo = calculateGradeDetails(percentage);
      const isPassed = titleResults.every(t => t.isAbsent || (t.obtained ?? 0) >= t.passMark);
      const creditHour = es.subject?.creditHour || 4.0;

      return {
        subject: es.subject?.name || 'Subject',
        subjectNepali: es.subject?.nameNepali || null,
        subjectCode: es.subject?.code || 'SUB',
        creditHour,
        theory: {
          fullMark: thFull,
          obtained: thTitles.length > 0 ? thObtained : null,
          letterGrade: thGrade?.letterGrade || '—',
          gradePoint: thGrade?.gradePoint ?? null,
        },
        practical: {
          fullMark: prFull,
          obtained: prTitles.length > 0 ? prObtained : null,
          letterGrade: prGrade?.letterGrade || '—',
          gradePoint: prGrade?.gradePoint ?? null,
        },
        titles: titleResults,
        totalFull,
        totalObtained,
        percentage,
        finalGrade: finalGradeInfo.letterGrade,
        gradePoint: finalGradeInfo.gradePoint,
        remarks: finalGradeInfo.remarks,
        isPassed,
      };
    });

    const grandTotal = subjectResults.reduce((s, r) => s + r.totalObtained, 0);
    const grandFull = subjectResults.reduce((s, r) => s + r.totalFull, 0);
    const percentage = grandFull > 0 ? +((grandTotal / grandFull) * 100).toFixed(2) : 0;

    // Calculate overall GPA
    const totalCreditHours = subjectResults.reduce((s, r) => s + r.creditHour, 0);
    const weightedPoints = subjectResults.reduce((s, r) => s + (r.gradePoint * r.creditHour), 0);
    const gpa = totalCreditHours > 0 ? +((weightedPoints / totalCreditHours).toFixed(2)) : 0.0;
    const overallGradeInfo = getOverallGradeFromGpa(gpa);

    return res.json({
      success: true,
      data: {
        isPublished: true,
        school,
        exam,
        student: {
          ...student,
          rollNo,
          symbolNo,
          className,
        },
        symbolNo,
        subjectResults,
        grandTotal,
        grandFull,
        percentage,
        gpa,
        overallGrade: overallGradeInfo.letterGrade,
        overallRemarks: overallGradeInfo.remarks,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/exams/:examId/ledger/:classId
router.get('/:examId/ledger/:classId', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const classId = parseInt(req.params.classId);

    // Strict Permission: Only Assigned Class Teacher or ADMIN can view the Class Ledger
    if (req.user.role === 'TEACHER') {
      const teacherId = req.user.teacher?.id;
      if (!teacherId) {
        return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
      }
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!targetClass || targetClass.classTeacherId !== teacherId) {
        return res.status(403).json({
          success: false,
          message: `Permission Denied: Class Ledger is strictly accessible only to the assigned Class Teacher for "${targetClass?.name || 'this class'}" and Administrators.`,
        });
      }
    }

    const school = await prisma.school.findFirst();
    const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { academicYear: true } });
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { subjects: { include: { subject: true } } },
    });

    const yearName = exam?.academicYear?.year || '2083';
    const className = cls?.name || `Class ${classId}`;

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, fullNameNepali: true, studentId: true, dateOfBirthBs: true } } },
      orderBy: { rollNo: 'asc' },
    });

    let examSubjects = await prisma.examSubject.findMany({
      where: { examId },
      include: { subject: true, markTitles: { orderBy: { orderIndex: 'asc' } } },
    });

    // If no exam subjects are configured yet, seamlessly load class subjects so all subjects are present
    if (examSubjects.length === 0 && cls?.subjects?.length > 0) {
      examSubjects = cls.subjects.map(cs => ({
        id: cs.subjectId,
        subjectId: cs.subjectId,
        subject: cs.subject,
        markTitles: [{ id: 0, title: 'Total', fullMark: 100, passMarkPct: 40 }],
      }));
    }

    const allMarks = await prisma.markEntry.findMany({
      where: {
        examSubjectId: { in: examSubjects.map(es => es.id) },
        studentId: { in: enrollments.map(e => e.studentId) },
      },
    });

    // Build ledger rows with both Mark-wise and Grade-wise calculations
    const rows = enrollments.map((enr, idx) => {
      const studentMarks = allMarks.filter(m => m.studentId === enr.studentId);
      let grandTotal = 0;
      let grandFull = 0;
      let totalWeightedPoints = 0;
      let totalCreditHours = 0;
      let hasAnyNG = false;

      const subjects = examSubjects.map(es => {
        const creditHour = es.subject?.creditHour || 4.0;
        totalCreditHours += creditHour;

        let subjectTotalObt = 0;
        let subjectTotalFull = 0;

        const titles = (es.markTitles || []).map(mt => {
          const entry = studentMarks.find(m => m.examSubjectId === es.id && m.markTitleId === mt.id);
          const fullMark = mt.fullMark || 0;
          const obtained = entry?.marksObtained !== null && entry?.marksObtained !== undefined ? entry.marksObtained : null;
          const isAbsent = entry?.isAbsent || false;
          
          if (obtained !== null && !isAbsent) {
            subjectTotalObt += obtained;
          }
          subjectTotalFull += fullMark;
          grandFull += fullMark;
          if (obtained !== null && !isAbsent) {
            grandTotal += obtained;
          }

          const pct = fullMark > 0 ? (obtained !== null ? +((obtained / fullMark) * 100).toFixed(2) : 0) : 0;
          const gradeInfo = calculateGradeDetails(pct);

          return {
            id: mt.id,
            title: mt.title,
            fullMark,
            obtained,
            isAbsent,
            percentage: pct,
            letterGrade: isAbsent ? 'ABS' : gradeInfo.letterGrade,
            gradePoint: isAbsent ? 0.0 : gradeInfo.gradePoint,
          };
        });

        const thTitle = titles.find(t => /theory|सैद्धान्तिक|th/i.test(t.title)) || (titles.length === 1 ? titles[0] : null);
        const prTitles = thTitle ? titles.filter(t => t.id !== thTitle.id) : titles.slice(1);
        
        const thFull = thTitle ? (thTitle.fullMark || 0) : (titles.length === 1 ? titles[0].fullMark : 0);
        const thObt = thTitle ? (thTitle.obtained !== null ? thTitle.obtained : null) : (titles.length === 1 ? titles[0].obtained : null);
        const thPct = thFull > 0 && thObt !== null ? +((thObt / thFull) * 100).toFixed(2) : 0;
        const thGradeInfo = calculateGradeDetails(thPct);

        const prFull = prTitles.reduce((s, t) => s + (t.fullMark || 0), 0);
        const hasPrEntries = prTitles.some(t => t.obtained !== null);
        const prObt = hasPrEntries ? prTitles.reduce((s, t) => s + (t.obtained || 0), 0) : (prFull > 0 ? 0 : null);
        const prPct = prFull > 0 && prObt !== null ? +((prObt / prFull) * 100).toFixed(2) : 0;
        const prGradeInfo = calculateGradeDetails(prPct);

        const theory = {
          fullMark: thFull,
          obtained: thObt,
          percentage: thPct,
          letterGrade: thObt === null ? '—' : thGradeInfo.letterGrade,
          gradePoint: thObt === null ? 0 : thGradeInfo.gradePoint,
        };

        const practical = {
          fullMark: prFull,
          obtained: prObt,
          percentage: prPct,
          letterGrade: prObt === null ? '—' : prGradeInfo.letterGrade,
          gradePoint: prObt === null ? 0 : prGradeInfo.gradePoint,
        };

        const subjectPct = subjectTotalFull > 0 ? +((subjectTotalObt / subjectTotalFull) * 100).toFixed(2) : 0;
        const finalGradeInfo = calculateGradeDetails(subjectPct);

        if (finalGradeInfo.letterGrade === 'NG') {
          hasAnyNG = true;
        }
        totalWeightedPoints += finalGradeInfo.gradePoint * creditHour;

        return {
          subjectId: es.subjectId,
          subjectName: es.subject?.name,
          subjectNepali: es.subject?.nameNepali,
          subjectCode: es.subject?.code,
          creditHour,
          titles,
          theory,
          practical,
          compiled: {
            fullMark: subjectTotalFull,
            obtained: subjectTotalObt,
            percentage: subjectPct,
            finalGrade: finalGradeInfo.letterGrade,
            gradePoint: finalGradeInfo.gradePoint,
            remarks: finalGradeInfo.remarks,
          },
          totalFull: subjectTotalFull,
          totalObtained: subjectTotalObt,
          percentage: subjectPct,
          finalGrade: finalGradeInfo.letterGrade,
          gradePoint: finalGradeInfo.gradePoint,
          remarks: finalGradeInfo.remarks,
        };
      });

      const percentage = grandFull > 0 ? +((grandTotal / grandFull) * 100).toFixed(2) : 0;
      const gpa = totalCreditHours > 0 ? +((totalWeightedPoints / totalCreditHours).toFixed(2)) : 0.0;
      const overallGradeInfo = getOverallGradeFromGpa(gpa);

      return {
        sn: idx + 1,
        studentId: enr.student.studentId,
        studentInternalId: enr.student.id,
        fullName: enr.student.fullName,
        fullNameNepali: enr.student.fullNameNepali,
        rollNo: enr.rollNo,
        symbolNo: generateSymbolNo(yearName, className, enr.rollNo),
        dateOfBirthBs: enr.student.dateOfBirthBs,
        subjects,
        grandTotal,
        grandFull,
        percentage,
        gpa,
        overallGrade: hasAnyNG ? 'NG' : overallGradeInfo.letterGrade,
        overallRemarks: hasAnyNG ? 'Needs Improvement' : overallGradeInfo.remarks,
        status: hasAnyNG ? 'NON_GRADED' : 'PASSED',
      };
    });

    // Rank by grandTotal descending
    const sorted = [...rows].sort((a, b) => b.grandTotal - a.grandTotal);
    sorted.forEach((r, i) => { r.rank = i + 1; });
    const rankedMap = {};
    sorted.forEach(r => { rankedMap[r.studentId] = r.rank; });
    rows.forEach(r => { r.rank = rankedMap[r.studentId]; });

    return res.json({
      success: true,
      data: {
        school,
        exam,
        className,
        subjects: examSubjects,
        rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/exams/:examId/bulk-marksheets/:classId — generate bulk grade sheets for entire class
router.get('/:examId/bulk-marksheets/:classId', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const classId = parseInt(req.params.classId);

    // Strict Permission: Only Assigned Class Teacher or ADMIN can bulk print class grade sheets
    if (req.user.role === 'TEACHER') {
      const teacherId = req.user.teacher?.id;
      if (!teacherId) {
        return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
      }
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!targetClass || targetClass.classTeacherId !== teacherId) {
        return res.status(403).json({
          success: false,
          message: `Permission Denied: Bulk Grade Sheets are strictly accessible only to the assigned Class Teacher for "${targetClass?.name || 'this class'}" and Administrators.`,
        });
      }
    }

    const school = await prisma.school.findFirst();
    const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { academicYear: true } });
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { subjects: { include: { subject: true } } },
    });

    const yearName = exam?.academicYear?.year || '2083';
    const className = cls?.name || `Class ${classId}`;

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isActive: true },
      include: { student: { select: { id: true, fullName: true, fullNameNepali: true, studentId: true, dateOfBirthBs: true } } },
      orderBy: { rollNo: 'asc' },
    });

    const examSubjects = await prisma.examSubject.findMany({
      where: { examId },
      include: {
        subject: true,
        markTitles: { orderBy: { orderIndex: 'asc' } },
      },
    });

    const allMarks = await prisma.markEntry.findMany({
      where: {
        examSubjectId: { in: examSubjects.map(es => es.id) },
        studentId: { in: enrollments.map(e => e.studentId) },
      },
    });

    const students = enrollments.map(enr => {
      const studentId = enr.student.id;
      const rollNo = enr.rollNo;
      const symbolNo = generateSymbolNo(yearName, className, rollNo);

      const subjectResults = examSubjects.map(es => {
        const titleResults = (es.markTitles || []).map(mt => {
          const entry = allMarks.find(me => me.studentId === studentId && me.examSubjectId === es.id && me.markTitleId === mt.id);
          const fullMark = mt.fullMark || 0;
          const obtained = entry?.marksObtained !== null && entry?.marksObtained !== undefined ? entry.marksObtained : null;
          const isAbsent = entry?.isAbsent || false;
          const pct = fullMark > 0 ? (obtained !== null ? +((obtained / fullMark) * 100).toFixed(2) : 0) : 0;
          const gradeInfo = calculateGradeDetails(pct);

          return {
            id: mt.id,
            title: mt.title,
            fullMark,
            rawFullMark: mt.rawFullMark,
            passMark: Math.ceil((fullMark * (mt.passMarkPct || 40)) / 100),
            obtained,
            isAbsent,
            percentage: pct,
            letterGrade: isAbsent ? 'ABS' : gradeInfo.letterGrade,
            gradePoint: isAbsent ? 0.0 : gradeInfo.gradePoint,
          };
        });

        // Split Theory vs Practical/Internal
        const thTitles = titleResults.filter(t => /theory|सैद्धान्तिक|written/i.test(t.title));
        const prTitles = titleResults.filter(t => !/theory|सैद्धान्तिक|written/i.test(t.title));

        const thFull = thTitles.reduce((s, t) => s + t.fullMark, 0);
        const thObtained = thTitles.reduce((s, t) => s + (t.obtained ?? 0), 0);
        const thPct = thFull > 0 ? +((thObtained / thFull) * 100).toFixed(2) : 0;
        const thGrade = thFull > 0 ? calculateGradeDetails(thPct) : null;

        const prFull = prTitles.reduce((s, t) => s + t.fullMark, 0);
        const prObtained = prTitles.reduce((s, t) => s + (t.obtained ?? 0), 0);
        const prPct = prFull > 0 ? +((prObtained / prFull) * 100).toFixed(2) : 0;
        const prGrade = prFull > 0 ? calculateGradeDetails(prPct) : null;

        const totalFull = titleResults.reduce((s, t) => s + t.fullMark, 0);
        const totalObtained = titleResults.reduce((s, t) => s + (t.obtained ?? 0), 0);
        const percentage = totalFull > 0 ? +((totalObtained / totalFull) * 100).toFixed(2) : 0;
        const finalGradeInfo = calculateGradeDetails(percentage);
        const isPassed = titleResults.every(t => t.isAbsent || (t.obtained ?? 0) >= t.passMark);
        const creditHour = es.subject?.creditHour || 4.0;

        return {
          subject: es.subject?.name || 'Subject',
          subjectNepali: es.subject?.nameNepali || null,
          subjectCode: es.subject?.code || 'SUB',
          creditHour,
          theory: {
            fullMark: thFull,
            obtained: thTitles.length > 0 ? thObtained : null,
            letterGrade: thGrade?.letterGrade || '—',
            gradePoint: thGrade?.gradePoint ?? null,
          },
          practical: {
            fullMark: prFull,
            obtained: prTitles.length > 0 ? prObtained : null,
            letterGrade: prGrade?.letterGrade || '—',
            gradePoint: prGrade?.gradePoint ?? null,
          },
          titles: titleResults,
          totalFull,
          totalObtained,
          percentage,
          finalGrade: finalGradeInfo.letterGrade,
          gradePoint: finalGradeInfo.gradePoint,
          remarks: finalGradeInfo.remarks,
          isPassed,
        };
      });

      const grandTotal = subjectResults.reduce((s, r) => s + r.totalObtained, 0);
      const grandFull = subjectResults.reduce((s, r) => s + r.totalFull, 0);
      const percentage = grandFull > 0 ? +((grandTotal / grandFull) * 100).toFixed(2) : 0;

      const totalCreditHours = subjectResults.reduce((s, r) => s + r.creditHour, 0);
      const weightedPoints = subjectResults.reduce((s, r) => s + (r.gradePoint * r.creditHour), 0);
      const gpa = totalCreditHours > 0 ? +((weightedPoints / totalCreditHours).toFixed(2)) : 0.0;
      const overallGradeInfo = getOverallGradeFromGpa(gpa);

      return {
        student: {
          ...enr.student,
          rollNo,
          symbolNo,
          className,
        },
        symbolNo,
        subjectResults,
        grandTotal,
        grandFull,
        percentage,
        gpa,
        overallGrade: overallGradeInfo.letterGrade,
        overallRemarks: overallGradeInfo.remarks,
      };
    });

    return res.json({
      success: true,
      data: {
        school,
        exam,
        className,
        students,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
