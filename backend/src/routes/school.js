const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/school/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const school = await prisma.school.findFirst();
    return res.json({ success: true, data: school });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/profile
router.post('/profile', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.school.findFirst();
    const school = existing
      ? await prisma.school.update({ where: { id: existing.id }, data: req.body })
      : await prisma.school.create({ data: req.body });
    return res.json({ success: true, data: school });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CERTIFICATES ──────────────────────────────────────────────────────────

router.get('/certificates', authenticate, async (req, res) => {
  try {
    const { type, studentId } = req.query;
    const where = {};
    if (type) where.type = type;
    if (studentId) where.studentId = parseInt(studentId);
    const certs = await prisma.certificate.findMany({
      where,
      include: { student: { select: { fullName: true, studentId: true } } },
      orderBy: { issuedDateAd: 'desc' },
    });
    return res.json({ success: true, data: certs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/certificates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const count = await prisma.certificate.count({ where: { type: req.body.type } });
    const prefix = req.body.type === 'CHARACTER' ? 'CC' : req.body.type === 'TRANSFER' ? 'TC' : 'CERT';
    const certificateNo = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const cert = await prisma.certificate.create({
      data: {
        ...req.body,
        studentId: parseInt(req.body.studentId),
        certificateNo,
        issuedDateAd: new Date(req.body.issuedDateAd || new Date()),
        data: req.body.data || {},
      },
      include: { student: true },
    });
    return res.status(201).json({ success: true, data: cert });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── BANK ACCOUNTS ─────────────────────────────────────────────────────────

router.get('/bank-accounts', authenticate, async (req, res) => {
  const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
  return res.json({ success: true, data: accounts });
});

router.post('/bank-accounts', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const acc = await prisma.bankAccount.create({ data: req.body });
    return res.status(201).json({ success: true, data: acc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/bank-accounts/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const acc = await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    return res.json({ success: true, data: acc, message: 'Bank account updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/bank-accounts/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    return res.json({ success: true, message: 'Bank account deactivated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const yrId = activeYear?.id;
    const yrFilter = yrId ? { academicYearId: yrId } : {};

    const [
      totalStudents,
      totalTeachers,
      totalRastriya,
      totalNiji,
      incomeAgg,
      feeAgg,
      expenseAgg,
      payrollAgg,
      overdueBooks,
      totalBooks,
    ] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true, type: 'RASTRIYA' } }),
      prisma.teacher.count({ where: { isActive: true, type: 'NIJI_SROTH' } }),
      prisma.incomeEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.payroll.aggregate({ where: { status: 'PAID' }, _sum: { khudPaaunuParne: true } }),
      prisma.libraryIssue.count({ where: { isReturned: false, dueDateAd: { lt: new Date() } } }),
      prisma.book.count(),
    ]);

    const todayBs = req.query.todayBs || '';
    const todayAbsent = todayBs
      ? await prisma.attendance.count({ where: { dateBs: todayBs, status: 'ABSENT' } })
      : 0;

    const grantIncome = incomeAgg._sum.amount || 0;
    const feeIncome = feeAgg._sum.amount || 0;
    const totalGrandIncome = grantIncome + feeIncome;

    const generalExpense = expenseAgg._sum.amount || 0;
    const payrollExpense = payrollAgg._sum.khudPaaunuParne || 0;
    const totalGrandExpense = generalExpense + payrollExpense;

    const netBalance = totalGrandIncome - totalGrandExpense;

    return res.json({
      success: true,
      data: {
        students: { total: totalStudents },
        teachers: { total: totalTeachers, rastriya: totalRastriya, nijiSroth: totalNiji },
        finance: {
          income: totalGrandIncome,
          grantIncome,
          selfIncome: feeIncome,
          expense: totalGrandExpense,
          generalExpense,
          payrollExpense,
          balance: netBalance,
        },
        library: { total: totalBooks, overdueIssues: overdueBooks },
        attendance: { todayAbsent },
        academicYear: activeYear,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CERTIFICATES ─────────────────────────────────────────────────────────

router.get('/certificates', authenticate, async (req, res) => {
  try {
    const certs = await prisma.certificate.findMany({
      include: {
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: certs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/certificates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { studentId, type, issuedDateBs, issuedBy, remarks, data } = req.body;
    
    // Generate sequential certificate number (e.g. CC-2081-0001 or TC-2081-0001)
    const prefix = type === 'TRANSFER' ? 'TC' : 'CC';
    const year = issuedDateBs ? issuedDateBs.split('-')[0] : '2081';
    const count = await prisma.certificate.count({ where: { type: type || 'CHARACTER' } });
    const certificateNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const cert = await prisma.certificate.create({
      data: {
        studentId: parseInt(studentId),
        type: type || 'CHARACTER',
        certificateNo,
        issuedDateBs,
        issuedBy: issuedBy || 'Head Teacher',
        remarks: remarks || null,
        data: typeof data === 'object' ? JSON.stringify(data) : data,
      },
      include: {
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: cert, message: 'Certificate issued successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── SYSTEM BACKUP & RESTORE ──────────────────────────────────────────────────

// GET /api/school/backup/export — Export all DB tables to downloadable JSON
router.get('/backup/export', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      school: await prisma.school.findMany(),
      academicYear: await prisma.academicYear.findMany(),
      user: await prisma.user.findMany(),
      teacher: await prisma.teacher.findMany(),
      student: await prisma.student.findMany(),
      class: await prisma.class.findMany(),
      classEnrollment: await prisma.classEnrollment.findMany(),
      subject: await prisma.subject.findMany(),
      classSubject: await prisma.classSubject.findMany(),
      teacherSubject: await prisma.teacherSubject.findMany(),
      feeHead: await prisma.feeHead.findMany(),
      classFeeStructure: await prisma.classFeeStructure.findMany(),
      studentFeeDue: await prisma.studentFeeDue.findMany(),
      feeCollection: await prisma.feeCollection.findMany(),
      incomeCategory: await prisma.incomeCategory.findMany(),
      incomeHead: await prisma.incomeHead.findMany(),
      incomeEntry: await prisma.incomeEntry.findMany(),
      expenseCategory: await prisma.expenseCategory.findMany(),
      expenseHead: await prisma.expenseHead.findMany(),
      expenseEntry: await prisma.expenseEntry.findMany(),
      salaryScale: await prisma.salaryScale.findMany(),
      payroll: await prisma.payroll.findMany(),
      attendance: await prisma.attendance.findMany(),
      exam: await prisma.exam.findMany(),
      examClass: await prisma.examClass.findMany(),
      examSubject: await prisma.examSubject.findMany(),
      markTitle: await prisma.markTitle.findMany(),
      markEntry: await prisma.markEntry.findMany(),
      book: await prisma.book.findMany(),
      libraryIssue: await prisma.libraryIssue.findMany(),
      inventoryCategory: await prisma.inventoryCategory.findMany(),
      inventoryItem: await prisma.inventoryItem.findMany(),
      notice: await prisma.notice.findMany(),
      certificate: await prisma.certificate.findMany(),
      bankAccount: await prisma.bankAccount.findMany(),
      event: await prisma.event.findMany(),
    };

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=nepal_school_erp_full_backup_${dateStr}.json`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/backup/import — Restore DB from JSON backup file
router.post('/backup/import', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid backup file payload.' });
    }

    const tablesOrder = [
      'school', 'academicYear', 'user', 'teacher', 'student', 'class',
      'classEnrollment', 'subject', 'classSubject', 'teacherSubject',
      'feeHead', 'classFeeStructure', 'studentFeeDue', 'feeCollection',
      'incomeCategory', 'incomeHead', 'incomeEntry', 'expenseCategory',
      'expenseHead', 'expenseEntry', 'salaryScale', 'payroll',
      'attendance', 'exam', 'examClass', 'examSubject', 'markTitle',
      'markEntry', 'book', 'libraryIssue', 'inventoryCategory',
      'inventoryItem', 'notice', 'certificate', 'bankAccount', 'event'
    ];

    let restoredCounts = {};
    for (const model of tablesOrder) {
      const rows = backupData[model] || [];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      restoredCounts[model] = rows.length;

      for (const row of rows) {
        try {
          const formatted = { ...row };
          for (const k of Object.keys(formatted)) {
            if ((k.endsWith('Ad') || k === 'createdAt' || k === 'updatedAt') && typeof formatted[k] === 'string') {
              formatted[k] = new Date(formatted[k]);
            }
          }

          if (model === 'user') {
            const { id, ...uData } = formatted;
            await prisma.user.upsert({ where: { username: formatted.username }, update: uData, create: { id, ...uData } });
          } else if (model === 'teacher') {
            const { id, ...tData } = formatted;
            await prisma.teacher.upsert({ where: { userId: formatted.userId }, update: tData, create: { id, ...tData } });
          } else if (model === 'student') {
            const { id, ...stData } = formatted;
            await prisma.student.upsert({ where: { studentId: formatted.studentId }, update: stData, create: { id, ...stData } });
          } else if (model === 'classEnrollment') {
            const { id, ...ceData } = formatted;
            await prisma.classEnrollment.upsert({
              where: { studentId_classId: { studentId: formatted.studentId, classId: formatted.classId } },
              update: ceData,
              create: { id, ...ceData },
            });
          } else if (model === 'attendance') {
            const { id, ...attData } = formatted;
            await prisma.attendance.upsert({
              where: { studentId_dateBs: { studentId: formatted.studentId, dateBs: formatted.dateBs } },
              update: attData,
              create: { id, ...attData },
            });
          } else {
            const { id, ...rest } = formatted;
            if (prisma[model] && typeof prisma[model].upsert === 'function') {
              await prisma[model].upsert({ where: { id: id || 1 }, update: rest, create: formatted }).catch(async () => {
                await prisma[model].create({ data: formatted }).catch(() => {});
              });
            }
          }
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      message: 'Backup restored successfully into system database!',
      restoredCounts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/school/backup/status — Summary of system records
router.get('/backup/status', authenticate, async (req, res) => {
  try {
    const [students, teachers, users, markEntries, feeCollections, attendance, classes, subjects] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count(),
      prisma.markEntry.count(),
      prisma.feeCollection.count(),
      prisma.attendance.count(),
      prisma.class.count(),
      prisma.subject.count(),
    ]);

    return res.json({
      success: true,
      data: { students, teachers, users, markEntries, feeCollections, attendance, classes, subjects },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
