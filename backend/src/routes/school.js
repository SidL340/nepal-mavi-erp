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

module.exports = router;
