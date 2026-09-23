const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/budget — list budget allocations with actual realization & variance
router.get('/', authenticate, async (req, res) => {
  try {
    const { financialYearId, type } = req.query;
    const where = {};
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    if (type) where.type = type;

    const budgets = await prisma.budget.findMany({
      where,
      include: { financialYear: true },
      orderBy: [{ type: 'asc' }, { headName: 'asc' }],
    });

    // Calculate actual realization for this financial year
    const fyId = financialYearId ? parseInt(financialYearId) : null;
    const expWhere = fyId ? { financialYearId: fyId } : {};
    const incWhere = fyId ? { financialYearId: fyId } : {};

    const [expenseActuals, incomeActuals] = await Promise.all([
      prisma.expenseEntry.groupBy({
        by: ['headId'],
        where: expWhere,
        _sum: { amount: true },
      }),
      prisma.incomeEntry.groupBy({
        by: ['headId'],
        where: incWhere,
        _sum: { amount: true },
      }),
    ]);

    const expActualMap = new Map(expenseActuals.map(e => [e.headId, e._sum.amount || 0]));
    const incActualMap = new Map(incomeActuals.map(i => [i.headId, i._sum.amount || 0]));

    const enriched = budgets.map(b => {
      let actual = 0;
      if (b.type === 'EXPENSE' && b.headId) {
        actual = expActualMap.get(b.headId) || 0;
      } else if (b.type === 'INCOME' && b.headId) {
        actual = incActualMap.get(b.headId) || 0;
      }
      const variance = b.yearlyEstimated - actual;
      const percentage = b.yearlyEstimated > 0 ? ((actual / b.yearlyEstimated) * 100).toFixed(1) : 0;
      return {
        ...b,
        actualSpentOrReceived: actual,
        variance,
        percentageUsed: parseFloat(percentage),
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/budget — create or update budget line
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      financialYearId,
      type,
      headId,
      headName,
      yearlyEstimated,
      monthlyEstimates,
      remarks,
    } = req.body;

    if (!financialYearId || !type || !headName) {
      return res.status(400).json({ success: false, message: 'Financial Year, Type, and Head Name are required.' });
    }

    const budget = await prisma.budget.create({
      data: {
        financialYearId: parseInt(financialYearId),
        type,
        headId: headId ? parseInt(headId) : null,
        headName: String(headName).trim(),
        yearlyEstimated: parseFloat(yearlyEstimated) || 0,
        monthlyEstimates: monthlyEstimates ? JSON.stringify(monthlyEstimates) : null,
        remarks: remarks ? String(remarks).trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: budget, message: 'बजेट विवरण सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/budget/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { headName, yearlyEstimated, monthlyEstimates, remarks } = req.body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(headName && { headName: String(headName).trim() }),
        ...(yearlyEstimated !== undefined && { yearlyEstimated: parseFloat(yearlyEstimated) || 0 }),
        ...(monthlyEstimates !== undefined && { monthlyEstimates: JSON.stringify(monthlyEstimates) }),
        ...(remarks !== undefined && { remarks }),
      },
    });

    return res.json({ success: true, data: budget, message: 'बजेट अद्यावधिक भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/budget/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.budget.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'बजेट विवरण हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
