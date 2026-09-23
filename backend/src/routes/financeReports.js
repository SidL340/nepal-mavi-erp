const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { resolveFinancialYearByDate } = require('./financialYears');

const router = express.Router();

// GET /api/finance-reports/executive-summary — main dashboard comprehensive stats
router.get('/executive-summary', authenticate, async (req, res) => {
  try {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    // BS today approximate or from query
    const todayBs = req.query.todayBs || '';

    // 1. Fee Collections: Today, This Month (same YYYY-MM in BS or AD), This Fiscal Year
    const currentFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    const fyId = currentFy ? currentFy.id : null;

    // Today's fees
    const feesToday = await prisma.feeCollection.aggregate({
      where: todayBs ? { paidDateBs: todayBs } : { paidDateAd: { gte: new Date(todayIso) } },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Month's fees (e.g. "2081-06")
    const monthPrefix = todayBs ? todayBs.slice(0, 7) : todayIso.slice(0, 7);
    const feesMonth = await prisma.feeCollection.aggregate({
      where: todayBs ? { paidDateBs: { startsWith: monthPrefix } } : { paidDateAd: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Fiscal Year's fees
    const feesYear = await prisma.feeCollection.aggregate({
      where: fyId ? { financialYearId: fyId } : {},
      _sum: { amount: true },
      _count: { id: true },
    });

    // 2. Student Attendance: Active students, Absent today
    const [activeStudentsCount, todayAbsentCount] = await Promise.all([
      prisma.student.count({ where: { isActive: true, status: 'ACTIVE' } }),
      prisma.attendance.count({
        where: {
          status: 'ABSENT',
          ...(todayBs ? { dateBs: todayBs } : { dateAd: { gte: new Date(todayIso) } }),
        },
      }),
    ]);

    // 3. Bank Balances & Cash Balance
    const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    
    // Incomes deposited to bank accounts
    const bankIncomes = await prisma.incomeEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null } },
      _sum: { amount: true },
    });
    const bankExpenses = await prisma.expenseEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null } },
      _sum: { amount: true },
    });

    const bankIncMap = new Map(bankIncomes.map(i => [i.bankAccountId, i._sum.amount || 0]));
    const bankExpMap = new Map(bankExpenses.map(e => [e.bankAccountId, e._sum.amount || 0]));

    let totalBankBalance = 0;
    const bankAccountsWithBalance = bankAccounts.map(b => {
      const inc = bankIncMap.get(b.id) || 0;
      const exp = bankExpMap.get(b.id) || 0;
      const bal = Math.round((inc - exp) * 100) / 100;
      totalBankBalance += bal;
      return {
        ...b,
        totalIncome: inc,
        totalExpense: exp,
        currentBalance: bal,
      };
    });

    // Cash on Hand: Cash Incomes + Cash Fees - Cash Expenses
    const [cashIncomes, cashFees, cashExpenses] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
    ]);

    const cashOnHand = Math.round(
      ((cashIncomes._sum.amount || 0) + (cashFees._sum.amount || 0) - (cashExpenses._sum.amount || 0)) * 100
    ) / 100;

    // 4. Receivables (Student Fee Dues)
    const feeDuesAgg = await prisma.studentFeeDue.aggregate({
      where: { isPaid: false },
      _sum: { amount: true, paidAmount: true },
    });
    const totalReceivables = Math.max(0, (feeDuesAgg._sum.amount || 0) - (feeDuesAgg._sum.paidAmount || 0));

    // 5. Payables (Vendor Bills Open Due)
    const allPayableExpenses = await prisma.expenseEntry.findMany({
      where: { partyId: { not: null }, billNo: { not: null } },
      select: { partyId: true, billNo: true, amount: true, description: true, remarks: true },
    });

    const openBillsMap = new Map();
    for (const e of allPayableExpenses) {
      if (!e.billNo || !e.billNo.trim() || e.billNo === 'LUMP-SUM-SETTLEMENT') continue;
      const pKey = `${e.partyId}_${e.billNo.trim()}`;
      if (!openBillsMap.has(pKey)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
        if (match) parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        openBillsMap.set(pKey, { total: parsedTotal, paid: 0 });
      }
      openBillsMap.get(pKey).paid += (e.amount || 0);
    }

    let totalPayables = 0;
    for (const b of openBillsMap.values()) {
      const due = Math.max(0, b.total - b.paid);
      totalPayables += due;
    }
    totalPayables = Math.round(totalPayables * 100) / 100;

    // 6. Financial Position Summary (Assets vs Liabilities)
    const totalCurrentAssets = Math.round((Math.max(0, totalBankBalance) + Math.max(0, cashOnHand) + totalReceivables) * 100) / 100;
    const totalLiabilities = totalPayables;
    const netPosition = Math.round((totalCurrentAssets - totalLiabilities) * 100) / 100;

    return res.json({
      success: true,
      data: {
        feeCollection: {
          today: feesToday._sum.amount || 0,
          todayCount: feesToday._count.id || 0,
          thisMonth: feesMonth._sum.amount || 0,
          thisMonthCount: feesMonth._count.id || 0,
          thisFiscalYear: feesYear._sum.amount || 0,
          thisFiscalYearCount: feesYear._count.id || 0,
        },
        students: {
          activeCount: activeStudentsCount,
          todayAbsentCount: todayAbsentCount,
        },
        balances: {
          totalBankBalance,
          cashOnHand,
          totalLiquidFunds: totalBankBalance + cashOnHand,
          bankAccounts: bankAccountsWithBalance,
        },
        dues: {
          totalReceivables,
          totalPayables,
        },
        financialPosition: {
          currentAssets: totalCurrentAssets,
          liabilities: totalLiabilities,
          netPosition,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/finance-reports/category-breakdown — category-wise income and expenses
router.get('/category-breakdown', authenticate, async (req, res) => {
  try {
    const { financialYearId, fromDateBs, toDateBs } = req.query;
    const whereExp = {};
    const whereInc = {};

    if (financialYearId) {
      whereExp.financialYearId = parseInt(financialYearId);
      whereInc.financialYearId = parseInt(financialYearId);
    }
    if (fromDateBs || toDateBs) {
      whereExp.expenseDateBs = {};
      whereInc.receivedDateBs = {};
      if (fromDateBs) {
        whereExp.expenseDateBs.gte = fromDateBs;
        whereInc.receivedDateBs.gte = fromDateBs;
      }
      if (toDateBs) {
        whereExp.expenseDateBs.lte = toDateBs;
        whereInc.receivedDateBs.lte = toDateBs;
      }
    }

    const [expenseEntries, incomeEntries, expenseCategories, incomeCategories] = await Promise.all([
      prisma.expenseEntry.findMany({
        where: whereExp,
        include: { head: { include: { category: true } }, party: true },
      }),
      prisma.incomeEntry.findMany({
        where: whereInc,
        include: { head: true, party: true },
      }),
      prisma.expenseCategory.findMany({ where: { isActive: true }, include: { expenseHeads: true } }),
      prisma.incomeCategory.findMany({ where: { isActive: true } }),
    ]);

    // Aggregate expense by category
    const expenseCategoryMap = new Map();
    for (const cat of expenseCategories) {
      expenseCategoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        nameNepali: cat.nameNepali,
        headsCount: cat.expenseHeads.length,
        totalAmount: 0,
        entriesCount: 0,
        heads: new Map(),
      });
    }

    for (const e of expenseEntries) {
      const catId = e.head?.category?.id || e.head?.categoryId || 0;
      if (!expenseCategoryMap.has(catId)) {
        expenseCategoryMap.set(catId, {
          id: catId,
          name: e.head?.category?.name || 'General / Other Expenses',
          nameNepali: e.head?.category?.nameNepali || 'अन्य खर्च',
          totalAmount: 0,
          entriesCount: 0,
          heads: new Map(),
        });
      }
      const cat = expenseCategoryMap.get(catId);
      cat.totalAmount += e.amount;
      cat.entriesCount++;

      const hId = e.headId;
      if (!cat.heads.has(hId)) {
        cat.heads.set(hId, {
          id: hId,
          name: e.head?.name || 'General',
          code: e.head?.code || '',
          totalAmount: 0,
          entriesCount: 0,
        });
      }
      const h = cat.heads.get(hId);
      h.totalAmount += e.amount;
      h.entriesCount++;
    }

    const expenseCategoryList = Array.from(expenseCategoryMap.values())
      .filter(c => c.totalAmount > 0 || c.entriesCount > 0)
      .map(c => ({
        ...c,
        heads: Array.from(c.heads.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return res.json({
      success: true,
      data: {
        expenses: expenseCategoryList,
        totalExpense: expenseEntries.reduce((sum, e) => sum + e.amount, 0),
        totalIncome: incomeEntries.reduce((sum, i) => sum + i.amount, 0),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
