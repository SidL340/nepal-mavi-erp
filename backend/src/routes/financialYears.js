const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to auto-resolve FinancialYear from a BS date string (e.g. "2083-05-15" or "2083-05")
 */
async function resolveFinancialYearByDate(dateBs) {
  if (!dateBs) return null;
  const cleanDate = dateBs.trim();

  // Find exact match within start/end range
  const allYears = await prisma.financialYear.findMany({ orderBy: { startDateBs: 'desc' } });
  for (const fy of allYears) {
    if (fy.startDateBs && fy.endDateBs) {
      if (cleanDate >= fy.startDateBs && cleanDate <= fy.endDateBs) {
        return fy;
      }
    }
  }

  // Fallback: match by year prefix (e.g. "2083" matches "2083/84" or "2083-84")
  const yearPrefix = cleanDate.slice(0, 4);
  const matchPrefix = allYears.find(fy => fy.year.startsWith(yearPrefix));
  if (matchPrefix) return matchPrefix;

  // Final fallback: active financial year
  const activeYear = allYears.find(fy => fy.isActive) || allYears[0];
  return activeYear || null;
}

// ── 1. GET ALL FINANCIAL YEARS ───────────────────────────────────────────────
router.get('/all', authenticate, async (req, res) => {
  try {
    const years = await prisma.financialYear.findMany({
      orderBy: { startDateBs: 'desc' },
      include: {
        _count: {
          select: {
            incomeEntries: true,
            expenseEntries: true,
            feeCollections: true,
            payrolls: true,
          }
        }
      }
    });
    return res.json({ success: true, data: years });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET ACTIVE FINANCIAL YEAR ─────────────────────────────────────────────
router.get('/active', authenticate, async (req, res) => {
  try {
    let active = await prisma.financialYear.findFirst({ where: { isActive: true } });
    if (!active) {
      active = await prisma.financialYear.findFirst({ orderBy: { startDateBs: 'desc' } });
    }
    return res.json({ success: true, data: active });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. RESOLVE FINANCIAL YEAR FROM BS DATE ──────────────────────────────────
router.get('/resolve', authenticate, async (req, res) => {
  try {
    const { dateBs } = req.query;
    const fy = await resolveFinancialYearByDate(dateBs);
    return res.json({ success: true, data: fy });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. CREATE FINANCIAL YEAR ─────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { year, startDateBs, endDateBs, isActive } = req.body;
    if (!year || !startDateBs || !endDateBs) {
      return res.status(400).json({ success: false, message: 'Year, Start Date BS, and End Date BS are required.' });
    }

    const cleanYear = year.trim();

    // Check duplicate name
    const existing = await prisma.financialYear.findFirst({
      where: { year: { equals: cleanYear, mode: 'insensitive' } }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Financial Year "${cleanYear}" already exists (ID: ${existing.id}).`
      });
    }

    if (isActive) {
      await prisma.financialYear.updateMany({ data: { isActive: false } });
    }

    const newFy = await prisma.financialYear.create({
      data: {
        year: cleanYear,
        startDateBs: startDateBs.trim(),
        endDateBs: endDateBs.trim(),
        isActive: !!isActive,
      }
    });

    return res.status(201).json({
      success: true,
      data: newFy,
      message: `Financial Year "${newFy.year}" created successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. UPDATE FINANCIAL YEAR ─────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { year, startDateBs, endDateBs, isActive } = req.body;

    if (isActive) {
      await prisma.financialYear.updateMany({ data: { isActive: false } });
    }

    const updated = await prisma.financialYear.update({
      where: { id },
      data: {
        year: year ? year.trim() : undefined,
        startDateBs: startDateBs ? startDateBs.trim() : undefined,
        endDateBs: endDateBs ? endDateBs.trim() : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    return res.json({
      success: true,
      data: updated,
      message: `Financial Year "${updated.year}" updated successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. SET ACTIVE FINANCIAL YEAR ─────────────────────────────────────────────
router.patch('/:id/activate', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.financialYear.updateMany({ data: { isActive: false } });
    const active = await prisma.financialYear.update({
      where: { id },
      data: { isActive: true },
    });
    return res.json({
      success: true,
      data: active,
      message: `Financial Year "${active.year}" is now active.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. DELETE FINANCIAL YEAR (SAFE & PROXY-PROOF) ─────────────────────────────
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const fy = await prisma.financialYear.findUnique({ where: { id } });
    if (!fy) {
      return res.json({ success: true, message: 'Financial Year already removed.' });
    }

    const force = req.body?.force === true || req.query?.force === 'true';

    // Count linked data
    const [incomeCount, expenseCount, feeCount, payrollCount] = await Promise.all([
      prisma.incomeEntry.count({ where: { financialYearId: id } }),
      prisma.expenseEntry.count({ where: { financialYearId: id } }),
      prisma.feeCollection.count({ where: { financialYearId: id } }),
      prisma.payroll.count({ where: { financialYearId: id } }),
    ]);

    if (!force && (incomeCount > 0 || expenseCount > 0 || feeCount > 0 || payrollCount > 0)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Financial Year "${fy.year}" because it has linked transactions (${incomeCount} income, ${expenseCount} expenses, ${feeCount} fee receipts, ${payrollCount} payrolls).`
      });
    }

    if (force) {
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      const targetId = activeFy && activeFy.id !== id ? activeFy.id : null;
      await prisma.incomeEntry.updateMany({ where: { financialYearId: id }, data: { financialYearId: targetId } }).catch(() => {});
      await prisma.expenseEntry.updateMany({ where: { financialYearId: id }, data: { financialYearId: targetId } }).catch(() => {});
      await prisma.feeCollection.updateMany({ where: { financialYearId: id }, data: { financialYearId: targetId } }).catch(() => {});
      await prisma.payroll.updateMany({ where: { financialYearId: id }, data: { financialYearId: targetId } }).catch(() => {});
    }

    await prisma.financialYear.delete({ where: { id } });
    return res.json({ success: true, message: `Financial Year "${fy.year}" deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const fy = await prisma.financialYear.findUnique({ where: { id } });
  if (!fy) return res.json({ success: true, message: 'Financial Year already removed.' });
  await prisma.financialYear.delete({ where: { id } });
  return res.json({ success: true, message: 'Financial Year deleted.' });
});

// ── 8. ANNUAL FINANCIAL REPORT PER FINANCIAL YEAR ────────────────────────────
router.get('/report/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fy = await prisma.financialYear.findUnique({ where: { id } });
    if (!fy) return res.status(404).json({ success: false, message: 'Financial Year not found.' });

    // Find all income entries for this FY
    const incomeEntries = await prisma.incomeEntry.findMany({
      where: {
        OR: [
          { financialYearId: id },
          {
            AND: [
              { receivedDateBs: { gte: fy.startDateBs } },
              { receivedDateBs: { lte: fy.endDateBs } },
            ]
          }
        ]
      },
      include: {
        head: { include: { category: true } },
        party: true,
      },
      orderBy: { receivedDateBs: 'asc' }
    });

    // Find all expense entries for this FY
    const expenseEntries = await prisma.expenseEntry.findMany({
      where: {
        OR: [
          { financialYearId: id },
          {
            AND: [
              { expenseDateBs: { gte: fy.startDateBs } },
              { expenseDateBs: { lte: fy.endDateBs } },
            ]
          }
        ]
      },
      include: {
        head: { include: { category: true } },
        party: true,
      },
      orderBy: { expenseDateBs: 'asc' }
    });

    // Find fee collections
    const feeCollections = await prisma.feeCollection.findMany({
      where: {
        OR: [
          { financialYearId: id },
          {
            AND: [
              { paidDateBs: { gte: fy.startDateBs } },
              { paidDateBs: { lte: fy.endDateBs } },
            ]
          }
        ]
      },
      include: {
        student: true,
        feeHead: true,
      },
      orderBy: { paidDateBs: 'asc' }
    });

    // Find payrolls
    const payrolls = await prisma.payroll.findMany({
      where: {
        OR: [
          { financialYearId: id },
          {
            AND: [
              { monthFrom: { gte: fy.startDateBs.slice(0, 7) } },
              { monthTo: { lte: fy.endDateBs.slice(0, 7) } },
            ]
          }
        ]
      },
      include: { teacher: true }
    });

    const totalIncome = incomeEntries.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpenses = expenseEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const totalFees = feeCollections.reduce((s, f) => s + (f.amount || 0), 0);
    const totalPayroll = payrolls.reduce((s, p) => s + (p.khudPaaunuParne || p.kulRakam || 0), 0);
    const netBalance = totalIncome - totalExpenses;

    // Group income by Category & Head
    const incomeByCategory = {};
    for (const entry of incomeEntries) {
      const catName = entry.head?.category?.name || 'General Income';
      const headName = entry.head?.name || 'Uncategorized';
      if (!incomeByCategory[catName]) incomeByCategory[catName] = { total: 0, heads: {} };
      incomeByCategory[catName].total += entry.amount || 0;
      if (!incomeByCategory[catName].heads[headName]) incomeByCategory[catName].heads[headName] = 0;
      incomeByCategory[catName].heads[headName] += entry.amount || 0;
    }

    // Group expenses by Category & Head
    const expenseByCategory = {};
    for (const entry of expenseEntries) {
      const catName = entry.head?.category?.name || 'General Expense';
      const headName = entry.head?.name || 'Uncategorized';
      if (!expenseByCategory[catName]) expenseByCategory[catName] = { total: 0, heads: {} };
      expenseByCategory[catName].total += entry.amount || 0;
      if (!expenseByCategory[catName].heads[headName]) expenseByCategory[catName].heads[headName] = 0;
      expenseByCategory[catName].heads[headName] += entry.amount || 0;
    }

    return res.json({
      success: true,
      data: {
        financialYear: fy,
        summary: {
          totalIncome,
          totalExpenses,
          totalFees,
          totalPayroll,
          netBalance,
        },
        incomeByCategory,
        expenseByCategory,
        incomeEntries,
        expenseEntries,
        feeCollections,
        payrolls,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = {
  router,
  resolveFinancialYearByDate,
};
