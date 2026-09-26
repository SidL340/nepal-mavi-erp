const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveFinancialYearByDate, resolveAcademicYearForFinance } = require('./financialYears');

const router = express.Router();

// Payroll calculation engine — exact Nepal GoN school formula
function calculatePayroll(data) {
  const moolTalab = parseFloat(data.moolTalab || 0); // A
  const gradeNo = parseInt(data.gradeNo || 0); // B
  const gradeAmount = parseFloat(data.gradeAmount || 0); // C
  const gradeRakam = +(gradeNo * gradeAmount).toFixed(2); // D = B * C
  const gradeSahitTalab = +(moolTalab + gradeRakam).toFixed(2); // E = A + D
  const karmachari10Pct = +(gradeSahitTalab * 0.10).toFixed(2); // F = 10% of E
  const bimaThap = parseFloat(data.bimaThap !== undefined ? data.bimaThap : 400); // G (Insurance Gov addition)
  const kulTalab = +(gradeSahitTalab + karmachari10Pct + bimaThap).toFixed(2); // H = E + F + G

  // Allowances (Bhata)
  const praABhata = parseFloat(data.praABhata || 0); // I
  const mahangiGhata = parseFloat(data.mahangiGhata !== undefined ? data.mahangiGhata : 2000); // J
  const durgamBhata = parseFloat(data.durgamBhata || 0); // K
  const protsahanBhata = parseFloat(data.protsahanBhata || 0); // L
  const otherBhata = parseFloat(data.otherBhata || 0); // M
  const sahayakPraABhata = parseFloat(data.sahayakPraABhata || 0);
  const prabiInchargeBhata = parseFloat(data.prabiInchargeBhata || 0);
  const mabiInchargeBhata = parseFloat(data.mabiInchargeBhata || 0);

  const jammaBhata = +(
    praABhata +
    mahangiGhata +
    durgamBhata +
    protsahanBhata +
    otherBhata +
    sahayakPraABhata +
    prabiInchargeBhata +
    mabiInchargeBhata
  ).toFixed(2); // N = I + J + K + L + M

  const jammaTalabBhata = +(kulTalab + jammaBhata).toFixed(2); // O = H + N

  // Period / Month Multiplier (default 3 months for traimasik)
  const monthCount = parseInt(data.monthCount || 3);
  const traimasikTalan = +(jammaTalabBhata * monthCount).toFixed(2); // P = O * monthCount

  // Deductions (Bibhinna Katti)
  // Q = (20% of E) * monthCount
  const ssk20Pct = +(gradeSahitTalab * 0.20 * monthCount).toFixed(2); // Q
  const karmachariKoshSapati = parseFloat(data.karmachariKoshSapati || 0); // R
  // S = (G * 2) * monthCount
  const bimaKati = parseFloat(
    data.bimaKati !== undefined ? data.bimaKati : +(bimaThap * 2 * monthCount).toFixed(2)
  ); // S
  const peshkiKati = parseFloat(data.peshkiKati || 0);

  const jammaKati = +(ssk20Pct + karmachariKoshSapati + bimaKati + peshkiKati).toFixed(2); // T = Q + R + S
  const bakiPaaunuParne = +(traimasikTalan - jammaKati).toFixed(2); // U = P - T

  // Festival & Dress allowances
  const includeChaadparba = Boolean(data.includeChaadparba);
  const chaadparbaKharcha = includeChaadparba
    ? parseFloat(data.chaadparbaKharcha !== undefined ? data.chaadparbaKharcha : gradeSahitTalab)
    : 0; // V = E
  const poshakBhata = parseFloat(data.poshakBhata || 0); // W
  const peshki = parseFloat(data.peshki || 0);

  const kulRakam = +(bakiPaaunuParne + chaadparbaKharcha + poshakBhata + peshki).toFixed(2); // X = U + V + W

  const samajikSurakshaKar1Pct = +(kulRakam * 0.01).toFixed(2); // Y = 1% of X
  const khudPaaunuParne = +(kulRakam - samajikSurakshaKar1Pct).toFixed(2); // Z = X - Y

  return {
    gradeRakam,
    gradeSahitTalab,
    karmachari10Pct,
    ssk20Pct,
    jammaBhata,
    jammaTalabBhata,
    traimasikTalan,
    jammaKati,
    bakiPaaunuParne,
    chaadparbaKharcha,
    peshki,
    kulRakam,
    samajikSurakshaKar1Pct,
    khudPaaunuParne,
    // Extra metadata
    bimaThap,
    durgamBhata,
    protsahanBhata,
    poshakBhata,
    monthCount,
  };
}

// GET /api/payroll — list
router.get('/', authenticate, async (req, res) => {
  try {
    const { teacherId, academicYearId, financialYearId, monthFrom, monthTo, status, page = 1, limit = 100 } = req.query;
    const where = {};
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);
    if (monthFrom) where.monthFrom = { contains: monthFrom };
    if (monthTo) where.monthTo = { contains: monthTo };
    if (status) where.status = status;

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: { teacher: { select: { fullName: true, fullNameNepali: true, type: true, taha: true, shreni: true, post: true, phone: true } }, academicYear: true, financialYear: true },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.payroll.count({ where }),
    ]);
    return res.json({ success: true, data: payrolls, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/:id
router.get('/:id', authenticate, async (req, res) => {
  const idNum = parseInt(req.params.id);
  if (isNaN(idNum)) {
    return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
  }
  const p = await prisma.payroll.findUnique({
    where: { id: idNum },
    include: { teacher: true, academicYear: true, financialYear: true },
  });
  if (!p) return res.status(404).json({ success: false, message: 'Not found.' });
  return res.json({ success: true, data: p });
});

// POST /api/payroll/calculate — preview without saving
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const calc = calculatePayroll(req.body);
    return res.json({ success: true, data: { ...req.body, ...calc } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/bulk-save — Bulk create or update multiple payroll records for the period
router.post('/bulk-save', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { items, monthFrom, monthTo, academicYearId, financialYearId, monthCount = 3 } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No staff payroll items provided.' });
    }

    let fyId = financialYearId ? parseInt(financialYearId) : null;
    if (!fyId && monthFrom) {
      const dateForResolution = monthFrom.length === 7 ? `${monthFrom}-01` : monthFrom;
      const resolved = await resolveFinancialYearByDate(dateForResolution);
      if (resolved) fyId = resolved.id;
    }

    let ayId = academicYearId ? parseInt(academicYearId) : null;
    if (!ayId) {
      const activeAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (activeAy) ayId = activeAy.id;
    }

    const createdRecords = [];

    for (const item of items) {
      if (!item.teacherId) continue;
      const calc = calculatePayroll({ ...item, monthCount });

      const remarksObj = {
        bimaThap: calc.bimaThap,
        durgamBhata: calc.durgamBhata,
        protsahanBhata: calc.protsahanBhata,
        poshakBhata: calc.poshakBhata,
        monthCount: calc.monthCount,
        note: item.remarks || '',
      };

      const record = await prisma.payroll.create({
        data: {
          teacherId: parseInt(item.teacherId),
          academicYearId: ayId || 1,
          financialYearId: fyId,
          monthFrom: item.monthFrom || monthFrom,
          monthTo: item.monthTo || monthTo,
          taha: item.taha || 'मावि',
          shreni: item.shreni || 'तृतीय',
          moolTalab: parseFloat(item.moolTalab || 0),
          gradeNo: parseInt(item.gradeNo || 0),
          gradeAmount: parseFloat(item.gradeAmount || 0),
          mahangiGhata: parseFloat(item.mahangiGhata !== undefined ? item.mahangiGhata : 2000),
          praABhata: parseFloat(item.praABhata || 0),
          sahayakPraABhata: parseFloat(item.sahayakPraABhata || 0),
          prabiInchargeBhata: parseFloat(item.prabiInchargeBhata || 0),
          mabiInchargeBhata: parseFloat(item.mabiInchargeBhata || 0),
          otherBhata: parseFloat(item.otherBhata || 0),
          otherBhataLabel: item.otherBhataLabel || 'विविध भत्ता',
          karmachariKoshSapati: parseFloat(item.karmachariKoshSapati || 0),
          bimaKati: parseFloat(item.bimaKati || 0),
          peshkiKati: parseFloat(item.peshkiKati || 0),
          peshki: parseFloat(item.poshakBhata || item.peshki || 0),
          remarks: JSON.stringify(remarksObj),
          gradeRakam: calc.gradeRakam,
          gradeSahitTalab: calc.gradeSahitTalab,
          karmachari10Pct: calc.karmachari10Pct,
          ssk20Pct: calc.ssk20Pct,
          jammaBhata: calc.jammaBhata,
          jammaTalabBhata: calc.jammaTalabBhata,
          traimasikTalan: calc.traimasikTalan,
          jammaKati: calc.jammaKati,
          bakiPaaunuParne: calc.bakiPaaunuParne,
          chaadparbaKharcha: calc.chaadparbaKharcha,
          kulRakam: calc.kulRakam,
          samajikSurakshaKar1Pct: calc.samajikSurakshaKar1Pct,
          khudPaaunuParne: calc.khudPaaunuParne,
          status: 'DRAFT',
        },
        include: { teacher: true },
      });

      createdRecords.push(record);
    }

    return res.status(201).json({
      success: true,
      data: createdRecords,
      message: `सफलतापूर्वक ${createdRecords.length} जना शिक्षक/कर्मचारीको तलब विवरण दर्ता गरियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Bulk save failed: ' + err.message });
  }
});

// POST /api/payroll — create single
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const calc = calculatePayroll(req.body);
    let fyId = req.body.financialYearId ? parseInt(req.body.financialYearId) : null;
    if (!fyId && req.body.monthFrom) {
      const dateForResolution = req.body.monthFrom.length === 7 ? `${req.body.monthFrom}-01` : req.body.monthFrom;
      const resolved = await resolveFinancialYearByDate(dateForResolution);
      if (resolved) fyId = resolved.id;
    }

    const payroll = await prisma.payroll.create({
      data: {
        teacherId: parseInt(req.body.teacherId),
        academicYearId: parseInt(req.body.academicYearId || 1),
        financialYearId: fyId,
        monthFrom: req.body.monthFrom,
        monthTo: req.body.monthTo,
        taha: req.body.taha,
        shreni: req.body.shreni,
        moolTalab: parseFloat(req.body.moolTalab),
        gradeNo: parseInt(req.body.gradeNo || 0),
        gradeAmount: parseFloat(req.body.gradeAmount || 0),
        mahangiGhata: parseFloat(req.body.mahangiGhata || 0),
        praABhata: parseFloat(req.body.praABhata || 0),
        sahayakPraABhata: parseFloat(req.body.sahayakPraABhata || 0),
        prabiInchargeBhata: parseFloat(req.body.prabiInchargeBhata || 0),
        mabiInchargeBhata: parseFloat(req.body.mabiInchargeBhata || 0),
        otherBhata: parseFloat(req.body.otherBhata || 0),
        otherBhataLabel: req.body.otherBhataLabel,
        karmachariKoshSapati: parseFloat(req.body.karmachariKoshSapati || 0),
        bimaKati: parseFloat(req.body.bimaKati || 0),
        peshkiKati: parseFloat(req.body.peshkiKati || 0),
        peshki: parseFloat(req.body.peshki || 0),
        remarks: req.body.remarks,
        ...calc,
      },
      include: { teacher: true, academicYear: true, financialYear: true },
    });
    return res.status(201).json({ success: true, data: payroll });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/payroll/:id — Edit existing payroll
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const calc = calculatePayroll(req.body);
    let fyId = req.body.financialYearId ? parseInt(req.body.financialYearId) : undefined;
    if (fyId === undefined && req.body.monthFrom) {
      const dateForResolution = req.body.monthFrom.length === 7 ? `${req.body.monthFrom}-01` : req.body.monthFrom;
      const resolved = await resolveFinancialYearByDate(dateForResolution);
      if (resolved) fyId = resolved.id;
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        teacherId: req.body.teacherId ? parseInt(req.body.teacherId) : undefined,
        academicYearId: req.body.academicYearId ? parseInt(req.body.academicYearId) : undefined,
        financialYearId: fyId,
        monthFrom: req.body.monthFrom,
        monthTo: req.body.monthTo,
        taha: req.body.taha,
        shreni: req.body.shreni,
        moolTalab: req.body.moolTalab ? parseFloat(req.body.moolTalab) : undefined,
        gradeNo: req.body.gradeNo !== undefined ? parseInt(req.body.gradeNo) : undefined,
        gradeAmount: req.body.gradeAmount !== undefined ? parseFloat(req.body.gradeAmount) : undefined,
        mahangiGhata: req.body.mahangiGhata !== undefined ? parseFloat(req.body.mahangiGhata) : undefined,
        praABhata: req.body.praABhata !== undefined ? parseFloat(req.body.praABhata) : undefined,
        sahayakPraABhata: req.body.sahayakPraABhata !== undefined ? parseFloat(req.body.sahayakPraABhata) : undefined,
        prabiInchargeBhata: req.body.prabiInchargeBhata !== undefined ? parseFloat(req.body.prabiInchargeBhata) : undefined,
        mabiInchargeBhata: req.body.mabiInchargeBhata !== undefined ? parseFloat(req.body.mabiInchargeBhata) : undefined,
        otherBhata: req.body.otherBhata !== undefined ? parseFloat(req.body.otherBhata) : undefined,
        otherBhataLabel: req.body.otherBhataLabel,
        karmachariKoshSapati: req.body.karmachariKoshSapati !== undefined ? parseFloat(req.body.karmachariKoshSapati) : undefined,
        bimaKati: req.body.bimaKati !== undefined ? parseFloat(req.body.bimaKati) : undefined,
        peshkiKati: req.body.peshkiKati !== undefined ? parseFloat(req.body.peshkiKati) : undefined,
        peshki: req.body.peshki !== undefined ? parseFloat(req.body.peshki) : undefined,
        remarks: req.body.remarks,
        ...calc,
      },
      include: { teacher: true, academicYear: true, financialYear: true },
    });
    return res.json({ success: true, data: payroll, message: 'Payroll record updated successfully.' });
    return res.json({ success: true, data: payroll, message: 'Payroll record updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/payroll/:id/status
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    const p = await prisma.payroll.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });
    return res.json({ success: true, data: p });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/payroll/:id
const deletePayrollHandler = async (req, res) => {
  try {
    await prisma.payroll.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Payroll record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deletePayrollHandler);
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deletePayrollHandler);

// GET /api/payroll/salary-scales/list (active only)
router.get('/salary-scales/list', authenticate, async (req, res) => {
  try {
    const scales = await prisma.salaryScale.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
    return res.json({ success: true, data: scales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/salary-scales/all (all scales for admin management)
router.get('/salary-scales/all', authenticate, async (req, res) => {
  try {
    const scales = await prisma.salaryScale.findMany({ orderBy: { id: 'asc' } });
    return res.json({ success: true, data: scales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/salary-scales (create)
router.post('/salary-scales', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { taha, shreni, moolTalab, gradeAmount, isActive = true } = req.body;
    const scale = await prisma.salaryScale.create({
      data: {
        taha,
        shreni,
        moolTalab: parseFloat(moolTalab),
        gradeAmount: parseFloat(gradeAmount || 0),
        isActive: Boolean(isActive),
      },
    });
    return res.status(201).json({ success: true, data: scale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/payroll/salary-scales/:id (update existing scale)
router.put('/salary-scales/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { taha, shreni, moolTalab, gradeAmount, isActive } = req.body;
    const data = {};
    if (taha !== undefined) data.taha = taha;
    if (shreni !== undefined) data.shreni = shreni;
    if (moolTalab !== undefined) data.moolTalab = parseFloat(moolTalab);
    if (gradeAmount !== undefined) data.gradeAmount = parseFloat(gradeAmount);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const scale = await prisma.salaryScale.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    return res.json({ success: true, data: scale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/salary-scales/seed-default (Seed standard Nepal GoN school salary scales)
router.post('/salary-scales/seed-default', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const defaultScales = [
      { taha: 'माध्यमिक तह', shreni: 'प्रथम श्रेणी', moolTalab: 54330, gradeAmount: 1811 },
      { taha: 'माध्यमिक तह', shreni: 'द्वितीय श्रेणी', moolTalab: 48737, gradeAmount: 1625 },
      { taha: 'माध्यमिक तह', shreni: 'तृतीय श्रेणी', moolTalab: 43689, gradeAmount: 1456 },
      { taha: 'निम्न माध्यमिक तह', shreni: 'प्रथम श्रेणी', moolTalab: 48737, gradeAmount: 1625 },
      { taha: 'निम्न माध्यमिक तह', shreni: 'द्वितीय श्रेणी', moolTalab: 43689, gradeAmount: 1456 },
      { taha: 'निम्न माध्यमिक तह', shreni: 'तृतीय श्रेणी', moolTalab: 34730, gradeAmount: 1158 },
      { taha: 'प्राथमिक तह', shreni: 'प्रथम श्रेणी', moolTalab: 43689, gradeAmount: 1456 },
      { taha: 'प्राथमिक तह', shreni: 'द्वितीय श्रेणी', moolTalab: 34730, gradeAmount: 1158 },
      { taha: 'प्राथमिक तह', shreni: 'तृतीय श्रेणी', moolTalab: 32902, gradeAmount: 1097 },
      { taha: 'लेखापाल / प्रशासन', shreni: 'पाँचौं तह', moolTalab: 34730, gradeAmount: 1158 },
      { taha: 'कार्यालय सहयोगी', shreni: 'श्रेणीविहीन', moolTalab: 26082, gradeAmount: 869 },
    ];

    let createdCount = 0;
    for (const sc of defaultScales) {
      const exists = await prisma.salaryScale.findFirst({
        where: { taha: sc.taha, shreni: sc.shreni },
      });
      if (!exists) {
        await prisma.salaryScale.create({
          data: { ...sc, isActive: true },
        });
        createdCount++;
      }
    }

    const allScales = await prisma.salaryScale.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
    return res.json({
      success: true,
      data: allScales,
      message: `नेपाल सरकारको आधिकारिक शिक्षक तलब स्केल सुरक्षित गरियो! (${createdCount} नयाँ स्केल थपिए)`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/payroll/salary-scales/:id
router.delete('/salary-scales/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.salaryScale.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Salary scale deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/disburse-bank-bulk — bulk disburse teacher salaries from school bank account
router.post('/disburse-bank-bulk', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      payrollIds,
      bankAccountId,
      paymentDateBs,
      chequeNo,
      chequePayeeName,
      voucherNo,
      remarks,
    } = req.body;

    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one teacher payroll record.' });
    }
    if (!bankAccountId) {
      return res.status(400).json({ success: false, message: 'Select school bank account for salary allotment.' });
    }

    const parsedIds = payrollIds.map(id => parseInt(id));
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: parseInt(bankAccountId) } });
    if (!bankAccount) return res.status(404).json({ success: false, message: 'Bank account not found.' });

    // Fetch the payroll records
    const payrolls = await prisma.payroll.findMany({
      where: { id: { in: parsedIds } },
      include: { teacher: true },
    });

    if (payrolls.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid payrolls found.' });
    }

    // Calculate total net payable sum
    let totalSalarySum = 0;
    for (const p of payrolls) {
      totalSalarySum += (p.khudPaaunuParne || p.kulRakam || 0);
    }
    totalSalarySum = Math.round(totalSalarySum * 100) / 100;

    // Resolve Financial Year & Academic Year
    let fyId = payrolls[0].financialYearId;
    if (!fyId && paymentDateBs) {
      const resolved = await resolveFinancialYearByDate(paymentDateBs);
      if (resolved) fyId = resolved.id;
    }

    const ayId = await resolveAcademicYearForFinance({
      academicYearId: payrolls[0].academicYearId,
      financialYearId: fyId,
      dateBs: paymentDateBs,
    });

    // Find or create "Teacher Salary / शिक्षक तलब" Expense Head
    let salaryHead = await prisma.expenseHead.findFirst({
      where: {
        OR: [
          { name: { contains: 'Salary' } },
          { name: { contains: 'तलब' } },
          { nameNepali: { contains: 'तलब' } },
        ],
        isActive: true,
      },
    });

    if (!salaryHead) {
      let defaultCat = await prisma.expenseCategory.findFirst({ where: { isActive: true } });
      if (!defaultCat) {
        defaultCat = await prisma.expenseCategory.create({ data: { name: 'Administrative / Salary', nameNepali: 'प्रशासनिक तथा तलब' } });
      }
      salaryHead = await prisma.expenseHead.create({
        data: {
          categoryId: defaultCat.id,
          name: 'Teacher & Staff Salary (शिक्षक तथा कर्मचारी तलब)',
          nameNepali: 'शिक्षक तथा कर्मचारी तलब',
          code: '21111',
          isActive: true,
        },
      });
    }

    const teacherNames = payrolls.map(p => p.teacher?.fullName || `Teacher #${p.teacherId}`).join(', ');
    const descText = `Bulk Bank Salary Allotment (${payrolls.length} Teachers: ${teacherNames.slice(0, 100)}${teacherNames.length > 100 ? '...' : ''})`;

    // Create single unified Expense Entry for the bank transaction
    const expenseEntry = await prisma.expenseEntry.create({
      data: {
        headId: salaryHead.id,
        financialYearId: fyId,
        academicYearId: ayId,
        amount: totalSalarySum,
        expenseDateBs: paymentDateBs || '2081-01-01',
        expenseDateAd: new Date(),
        paidTo: chequePayeeName || `${payrolls.length} Teachers (Staff Salary Batch)`,
        paymentMedium: 'CHEQUE',
        paidFromAccount: `${bankAccount.bankName} (${bankAccount.accountNo})`,
        bankAccountId: bankAccount.id,
        chequeNo: chequeNo || null,
        chequePayeeName: chequePayeeName || 'Teacher Salary Disbursement',
        voucherNo: voucherNo || undefined,
        description: descText,
        remarks: remarks || `Bulk teacher salary allotment disbursed via bank [${payrolls.length} staff records]`,
        approvedBy: 'Principal (प्रधानाध्यापक)',
      },
    });

    // Update all payroll records as PAID
    await prisma.payroll.updateMany({
      where: { id: { in: parsedIds } },
      data: {
        status: 'PAID',
        remarks: `Disbursed via Bank ${bankAccount.bankName} (Exp Entry #${expenseEntry.id}) on ${paymentDateBs || 'Today'}`,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        expenseEntry,
        totalDisbursed: totalSalarySum,
        payrollsCount: payrolls.length,
      },
      message: `${payrolls.length} जना शिक्षकहरूको कुल तलब रकम रू ${totalSalarySum.toLocaleString()} बैंक खाताबाट एकमुष्ट निकासा (Disbursed) भयो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;

