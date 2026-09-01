const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Payroll calculation engine — full Nepal GoN formula
function calculatePayroll(data) {
  const {
    moolTalab, gradeNo, gradeAmount,
    mahangiGhata = 0, praABhata = 0, sahayakPraABhata = 0,
    prabiInchargeBhata = 0, mabiInchargeBhata = 0, otherBhata = 0,
    karmachariKoshSapati = 0, bimaKati = 0, peshkiKati = 0,
    includeChaadparba = false, peshki = 0,
  } = data;

  const gradeRakam         = gradeNo * gradeAmount;
  const gradeSahitTalab    = moolTalab + gradeRakam;
  const karmachari10Pct    = +(gradeSahitTalab * 0.10).toFixed(2);
  const ssk20Pct           = +(gradeSahitTalab * 0.20).toFixed(2);
  const jammaBhata         = +(mahangiGhata + praABhata + sahayakPraABhata +
                              prabiInchargeBhata + mabiInchargeBhata + otherBhata).toFixed(2);
  const jammaTalabBhata    = +(gradeSahitTalab + jammaBhata).toFixed(2);
  const traimasikTalan     = +(jammaTalabBhata * 3).toFixed(2);
  const jammaKati          = +(karmachari10Pct + karmachariKoshSapati + bimaKati + peshkiKati).toFixed(2);
  const bakiPaaunuParne    = +(traimasikTalan - jammaKati).toFixed(2);
  const chaadparbaKharcha  = includeChaadparba ? gradeSahitTalab : 0;
  const kulRakam           = +(bakiPaaunuParne + chaadparbaKharcha + peshki).toFixed(2);
  const samajikSurakshaKar = +(kulRakam * 0.01).toFixed(2);
  const khudPaaunuParne    = +(kulRakam - samajikSurakshaKar).toFixed(2);

  return {
    gradeRakam, gradeSahitTalab, karmachari10Pct, ssk20Pct,
    jammaBhata, jammaTalabBhata, traimasikTalan,
    jammaKati, bakiPaaunuParne, chaadparbaKharcha, peshki,
    kulRakam, samajikSurakshaKar1Pct: samajikSurakshaKar, khudPaaunuParne,
  };
}

// GET /api/payroll — list
router.get('/', authenticate, async (req, res) => {
  try {
    const { teacherId, academicYearId, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (academicYearId) where.academicYearId = parseInt(academicYearId);
    if (status) where.status = status;
    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: { teacher: { select: { fullName: true, type: true, taha: true } }, academicYear: true },
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
    include: { teacher: true, academicYear: true },
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

// POST /api/payroll — create
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const calc = calculatePayroll(req.body);
    const payroll = await prisma.payroll.create({
      data: {
        teacherId: parseInt(req.body.teacherId),
        academicYearId: parseInt(req.body.academicYearId),
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
      include: { teacher: true, academicYear: true },
    });
    return res.status(201).json({ success: true, data: payroll });
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
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.payroll.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

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

// DELETE /api/payroll/salary-scales/:id
router.delete('/salary-scales/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.salaryScale.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Salary scale deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

