const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to compute standard Nepali Fiscal Year string from BS date
 * (Shrawan 4 to Chaitra 12 -> YYYY/YY+1, Baisakh 1 to Ashadh 3 -> YYYY-1/YY)
 */
function getFiscalYearFromBS(dateBs) {
  if (!dateBs) return '';
  const parts = dateBs.split('-');
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(y) || isNaN(m)) return '';

  if (m >= 4) {
    const nextY = (y + 1).toString().slice(-2);
    return `${y}/${nextY}`;
  } else {
    const prevY = y - 1;
    const currY = y.toString().slice(-2);
    return `${prevY}/${currY}`;
  }
}

/**
 * Helper to auto-resolve FinancialYear from a BS date string (e.g. "2083-05-15" or "2082-03-24")
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

  // Derived match by BS calculation (e.g. 2082-03-24 -> 2081/82)
  const derivedYear = getFiscalYearFromBS(cleanDate);
  if (derivedYear) {
    const matched = allYears.find(fy => fy.year === derivedYear || fy.year === derivedYear.replace('/', '-') || fy.year.replace(/\s+/g, '') === derivedYear);
    if (matched) return matched;
  }

  // Fallback: active financial year
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

    // 1. Income Entries (Grants, Subsidies, Internal Incomes)
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

    // 2. Fee Collections (Student Fees)
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

    // 3. Expense Entries (Operational, Educational, Maintenance, Capital)
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

    // 4. Payroll Records (Teacher & Staff Salaries)
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
      include: { teacher: true },
      orderBy: { monthFrom: 'asc' }
    });

    // 5. Bank Accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' }
    });

    // ── CALCULATION OF TOTALS ──
    const totalGeneralIncome = incomeEntries.reduce((s, i) => s + (i.amount || 0), 0);
    const totalFeeCollections = feeCollections.reduce((s, f) => s + (f.amount || 0), 0);
    const totalIncome = totalGeneralIncome + totalFeeCollections;

    const totalGeneralExpenses = expenseEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPayroll = payrolls.reduce((s, p) => s + (p.khudPaaunuParne || p.kulRakam || 0), 0);
    const totalExpenses = totalGeneralExpenses + totalPayroll;

    const netSurplus = totalIncome - totalExpenses;

    // ── GROUPINGS ──
    // Income by Category & Head
    const incomeCategoryMap = {};
    for (const entry of incomeEntries) {
      const catId = entry.head?.categoryId || 0;
      const catName = entry.head?.category?.name || 'General Grants & Incomes';
      const catNameNp = entry.head?.category?.nameNepali || 'सरकारी अनुदान तथा साधारण आम्दानी';
      if (!incomeCategoryMap[catId]) {
        incomeCategoryMap[catId] = {
          categoryId: catId,
          name: catName,
          nameNepali: catNameNp,
          total: 0,
          count: 0,
          heads: {}
        };
      }
      incomeCategoryMap[catId].total += (entry.amount || 0);
      incomeCategoryMap[catId].count += 1;

      const headId = entry.headId;
      const headName = entry.head?.name || 'Uncategorized';
      const headNameNp = entry.head?.nameNepali || '';
      if (!incomeCategoryMap[catId].heads[headId]) {
        incomeCategoryMap[catId].heads[headId] = {
          headId,
          name: headName,
          nameNepali: headNameNp,
          amount: 0,
          count: 0
        };
      }
      incomeCategoryMap[catId].heads[headId].amount += (entry.amount || 0);
      incomeCategoryMap[catId].heads[headId].count += 1;
    }

    const incomeByCategory = Object.values(incomeCategoryMap).map(c => ({
      ...c,
      heads: Object.values(c.heads)
    }));

    // Income by Source Level (Central, Provincial, Local, Internal, Other)
    const incomeBySourceLevel = {};
    for (const entry of incomeEntries) {
      const src = entry.sourceLevel || 'Other / Internal';
      if (!incomeBySourceLevel[src]) incomeBySourceLevel[src] = { level: src, total: 0, count: 0 };
      incomeBySourceLevel[src].total += (entry.amount || 0);
      incomeBySourceLevel[src].count += 1;
    }

    // Fee Collections by Fee Head
    const feeHeadMap = {};
    for (const fee of feeCollections) {
      const fId = fee.feeHeadId;
      const fName = fee.feeHead?.name || 'Tuition / General Fee';
      const fNameNp = fee.feeHead?.nameNepali || '';
      if (!feeHeadMap[fId]) {
        feeHeadMap[fId] = {
          feeHeadId: fId,
          name: fName,
          nameNepali: fNameNp,
          amount: 0,
          count: 0
        };
      }
      feeHeadMap[fId].amount += (fee.amount || 0);
      feeHeadMap[fId].count += 1;
    }
    const feeByHead = Object.values(feeHeadMap);

    // Expenses by Category & Head
    const expenseCategoryMap = {};
    for (const entry of expenseEntries) {
      const catId = entry.head?.categoryId || 0;
      const catName = entry.head?.category?.name || 'General Expense';
      const catNameNp = entry.head?.category?.nameNepali || 'साधारण तथा प्रशासनिक खर्च';
      if (!expenseCategoryMap[catId]) {
        expenseCategoryMap[catId] = {
          categoryId: catId,
          name: catName,
          nameNepali: catNameNp,
          total: 0,
          count: 0,
          heads: {}
        };
      }
      expenseCategoryMap[catId].total += (entry.amount || 0);
      expenseCategoryMap[catId].count += 1;

      const headId = entry.headId;
      const headName = entry.head?.name || 'Uncategorized';
      const headNameNp = entry.head?.nameNepali || '';
      const code = entry.head?.code || '';
      if (!expenseCategoryMap[catId].heads[headId]) {
        expenseCategoryMap[catId].heads[headId] = {
          headId,
          name: headName,
          nameNepali: headNameNp,
          code,
          amount: 0,
          count: 0
        };
      }
      expenseCategoryMap[catId].heads[headId].amount += (entry.amount || 0);
      expenseCategoryMap[catId].heads[headId].count += 1;
    }

    const expenseByCategory = Object.values(expenseCategoryMap).map(c => ({
      ...c,
      heads: Object.values(c.heads)
    }));

    // Payroll Summary & Teacher breakdown
    let totalBasicSalary = 0;
    let totalGradeAmount = 0;
    let totalAllowances = 0;
    let totalChadparbaKharcha = 0;
    let totalDeductions = 0;
    let totalTax = 0;
    let totalNetDisbursed = 0;
    let rastriyaPayroll = 0;
    let nijiPayroll = 0;

    const teacherPayrollMap = {};
    for (const p of payrolls) {
      const net = p.khudPaaunuParne || p.kulRakam || 0;
      totalBasicSalary += (p.moolTalab || 0);
      totalGradeAmount += (p.gradeRakam || 0);
      totalAllowances += (p.jammaBhata || (p.mahangiBhata || 0) + (p.praABhata || 0) + (p.sahayakPraABhata || 0) + (p.prabiInchargeBhata || 0) + (p.mabiInchargeBhata || 0) + (p.otherBhata || 0));
      totalChadparbaKharcha += (p.chaadparbaKharcha || 0);
      totalDeductions += (p.jammaKati || (p.ssk10 || 0) + (p.sapatiKatti || 0) + (p.bimaKatti || 0) + (p.peshkiKatti || 0));
      totalTax += (p.samajikSurakshaKar || 0);
      totalNetDisbursed += net;

      const tType = p.teacher?.type || 'RASTRIYA';
      if (tType === 'RASTRIYA') rastriyaPayroll += net;
      else nijiPayroll += net;

      const tId = p.teacherId;
      const tName = p.teacher?.fullName || 'Teacher';
      const tNameNp = p.teacher?.fullNameNepali || '';
      if (!teacherPayrollMap[tId]) {
        teacherPayrollMap[tId] = {
          teacherId: tId,
          fullName: tName,
          fullNameNepali: tNameNp,
          type: tType,
          taha: p.taha || p.teacher?.taha || '',
          monthsCount: 0,
          totalBasic: 0,
          totalGrade: 0,
          totalBhata: 0,
          totalDeductions: 0,
          totalNet: 0
        };
      }
      teacherPayrollMap[tId].monthsCount += 1;
      teacherPayrollMap[tId].totalBasic += (p.moolTalab || 0);
      teacherPayrollMap[tId].totalGrade += (p.gradeRakam || 0);
      teacherPayrollMap[tId].totalBhata += (p.jammaBhata || 0);
      teacherPayrollMap[tId].totalDeductions += (p.jammaKati || 0);
      teacherPayrollMap[tId].totalNet += net;
    }

    const payrollSummary = {
      count: payrolls.length,
      rastriyaPayroll,
      nijiPayroll,
      totalBasicSalary,
      totalGradeAmount,
      totalAllowances,
      totalChadparbaKharcha,
      totalDeductions,
      totalTax,
      totalNetDisbursed,
      teachers: Object.values(teacherPayrollMap)
    };

    // Parties Summary (Vendors, Contractors, Suppliers)
    const partyMap = {};
    for (const e of expenseEntries) {
      if (e.partyId && e.party) {
        if (!partyMap[e.partyId]) {
          partyMap[e.partyId] = {
            partyId: e.partyId,
            name: e.party.name,
            nameNepali: e.party.nameNepali,
            partyType: e.party.partyType,
            panNo: e.party.panNo,
            phone: e.party.phone,
            totalPaid: 0,
            totalReceived: 0,
            voucherCount: 0
          };
        }
        partyMap[e.partyId].totalPaid += (e.amount || 0);
        partyMap[e.partyId].voucherCount += 1;
      }
    }
    for (const i of incomeEntries) {
      if (i.partyId && i.party) {
        if (!partyMap[i.partyId]) {
          partyMap[i.partyId] = {
            partyId: i.partyId,
            name: i.party.name,
            nameNepali: i.party.nameNepali,
            partyType: i.party.partyType,
            panNo: i.party.panNo,
            phone: i.party.phone,
            totalPaid: 0,
            totalReceived: 0,
            voucherCount: 0
          };
        }
        partyMap[i.partyId].totalReceived += (i.amount || 0);
        partyMap[i.partyId].voucherCount += 1;
      }
    }
    const partiesSummary = Object.values(partyMap);

    // Payment Medium Breakdown
    const paymentMediumSummary = {
      CASH: { income: 0, expense: 0 },
      BANK_TRANSFER: { income: 0, expense: 0 },
      CHEQUE: { income: 0, expense: 0 },
      QR_CODE: { income: 0, expense: 0 },
      OTHER: { income: 0, expense: 0 }
    };
    for (const i of incomeEntries) {
      const med = i.paymentMedium || 'CASH';
      if (!paymentMediumSummary[med]) paymentMediumSummary[med] = { income: 0, expense: 0 };
      paymentMediumSummary[med].income += (i.amount || 0);
    }
    for (const f of feeCollections) {
      const med = f.paymentMedium || 'CASH';
      if (!paymentMediumSummary[med]) paymentMediumSummary[med] = { income: 0, expense: 0 };
      paymentMediumSummary[med].income += (f.amount || 0);
    }
    for (const e of expenseEntries) {
      const med = e.paymentMedium || 'CASH';
      if (!paymentMediumSummary[med]) paymentMediumSummary[med] = { income: 0, expense: 0 };
      paymentMediumSummary[med].expense += (e.amount || 0);
    }
    if (totalPayroll > 0) {
      paymentMediumSummary.BANK_TRANSFER.expense += totalPayroll;
    }

    return res.json({
      success: true,
      data: {
        financialYear: fy,
        totals: {
          totalGeneralIncome,
          totalFeeCollections,
          totalIncome,
          totalGeneralExpenses,
          totalPayroll,
          totalExpenses,
          netSurplus,
          incomeVouchersCount: incomeEntries.length + feeCollections.length,
          expenseVouchersCount: expenseEntries.length + payrolls.length,
        },
        incomeByCategory,
        incomeBySourceLevel: Object.values(incomeBySourceLevel),
        feeByHead,
        expenseByCategory,
        payrollSummary,
        partiesSummary,
        paymentMediumSummary,
        bankAccounts,
        incomes: incomeEntries,
        feeCollections,
        expenses: expenseEntries,
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
  getFiscalYearFromBS,
};
