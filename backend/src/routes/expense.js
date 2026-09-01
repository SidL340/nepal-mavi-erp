const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── EXPENSE CATEGORIES ────────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    include: { expenseHeads: { where: { isActive: true } } },
  });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.expenseCategory.create({ data: req.body });
    return res.status(201).json({ success: true, data: cat, message: 'Expense Category created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.expenseCategory.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: cat, message: 'Expense Category updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Category deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── EXPENSE HEADS ─────────────────────────────────────────────────────────

router.get('/heads', authenticate, async (req, res) => {
  const heads = await prisma.expenseHead.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: heads });
});

router.post('/heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const head = await prisma.expenseHead.create({ data: req.body });
    return res.status(201).json({ success: true, data: head, message: 'Expense Head created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const head = await prisma.expenseHead.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: head, message: 'Expense Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── EXPENSE ENTRIES ───────────────────────────────────────────────────────

router.get('/entries', authenticate, async (req, res) => {
  try {
    const { academicYearId, headId, categoryId, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = parseInt(academicYearId);
    if (headId) where.headId = parseInt(headId);
    if (categoryId) where.head = { categoryId: parseInt(categoryId) };
    if (from || to) {
      where.expenseDateBs = {};
      if (from) where.expenseDateBs.gte = from;
      if (to) where.expenseDateBs.lte = to;
    }
    const [entries, total] = await Promise.all([
      prisma.expenseEntry.findMany({
        where,
        include: { head: { include: { category: true } }, academicYear: true },
        orderBy: { expenseDateBs: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.expenseEntry.count({ where }),
    ]);
    const agg = await prisma.expenseEntry.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: entries, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/entries/:id', authenticate, async (req, res) => {
  const entry = await prisma.expenseEntry.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { head: { include: { category: true } }, academicYear: true },
  });
  if (!entry) return res.status(404).json({ success: false, message: 'Not found.' });
  return res.json({ success: true, data: entry });
});

router.post('/entries', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { expenseDateAd, ...rest } = req.body;
    const entry = await prisma.expenseEntry.create({
      data: {
        ...rest,
        amount: parseFloat(rest.amount),
        expenseDateAd: new Date(expenseDateAd),
        headId: parseInt(rest.headId),
        academicYearId: parseInt(rest.academicYearId),
      },
      include: { head: { include: { category: true } } },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { expenseDateAd, ...rest } = req.body;
    const entry = await prisma.expenseEntry.update({
      where: { id: parseInt(req.params.id) },
      data: { ...rest, expenseDateAd: expenseDateAd ? new Date(expenseDateAd) : undefined },
    });
    return res.json({ success: true, data: entry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME vs EXPENSE SUMMARY ──────────────────────────────────────────────

router.get('/summary', authenticate, async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const yrFilter = academicYearId ? { academicYearId: parseInt(academicYearId) } : {};
    const [totalIncome, totalExpense] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
    ]);
    return res.json({
      success: true,
      data: {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        balance: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
