const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── INCOME CATEGORIES ──────────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.incomeCategory.findMany({
    where: { isActive: true },
    include: { incomeHeads: { where: { isActive: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.incomeCategory.create({ data: req.body });
    return res.status(201).json({ success: true, data: cat, message: 'Income Category created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: cat, message: 'Category updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Category deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME HEADS ──────────────────────────────────────────────────────────

router.get('/heads', authenticate, async (req, res) => {
  const heads = await prisma.incomeHead.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: heads });
});

router.post('/heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const head = await prisma.incomeHead.create({ data: req.body });
    return res.status(201).json({ success: true, data: head, message: 'Income Head created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const head = await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: head, message: 'Income Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE HEADS ──────────────────────────────────────────────────────────────

router.get('/fee-heads', authenticate, async (req, res) => {
  const heads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return res.json({ success: true, data: heads });
});

router.post('/fee-heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const fh = await prisma.feeHead.create({
      data: {
        ...req.body,
        amount: parseFloat(req.body.amount || 0),
        incomeHeadId: req.body.incomeHeadId ? parseInt(req.body.incomeHeadId) : undefined,
      },
    });
    return res.status(201).json({ success: true, data: fh, message: 'Fee Head created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const fh = await prisma.feeHead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...req.body,
        amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : undefined,
        incomeHeadId: req.body.incomeHeadId ? parseInt(req.body.incomeHeadId) : undefined,
      },
    });
    return res.json({ success: true, data: fh, message: 'Fee Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.feeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Fee Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE COLLECTIONS ───────────────────────────────────────────────────────

router.get('/fee-collections', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (feeHeadId) where.feeHeadId = parseInt(feeHeadId);
    if (from || to) {
      where.paidDateBs = {};
      if (from) where.paidDateBs.gte = from;
      if (to) where.paidDateBs.lte = to;
    }
    const [collections, total] = await Promise.all([
      prisma.feeCollection.findMany({
        where,
        include: { student: true, feeHead: true },
        orderBy: { paidDateAd: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.feeCollection.count({ where }),
    ]);
    const agg = await prisma.feeCollection.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: collections, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fee-collections', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    // Generate receipt no
    const count = await prisma.feeCollection.count();
    const receiptNo = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const { paidDateAd, ...rest } = req.body;
    const collection = await prisma.feeCollection.create({
      data: {
        ...rest,
        amount: parseFloat(rest.amount),
        paidDateAd: new Date(paidDateAd || new Date()),
        studentId: parseInt(rest.studentId),
        feeHeadId: parseInt(rest.feeHeadId),
        receiptNo,
      },
      include: { student: true, feeHead: true },
    });

    // Mark corresponding fee due as paid if feeDueId passed
    if (rest.feeDueId) {
      await prisma.studentFeeDue.update({
        where: { id: parseInt(rest.feeDueId) },
        data: { isPaid: true, paidAmount: parseFloat(rest.amount) },
      }).catch(() => {});
    }

    return res.status(201).json({ success: true, data: collection, receiptNo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLASS-WISE FEE STRUCTURE ────────────────────────────────────────────────
// GET /api/income/class-fee-structures/matrix/all — All classes fee matrix
router.get('/class-fee-structures/matrix/all', authenticate, async (req, res) => {
  try {
    const [classes, feeHeads, structures] = await Promise.all([
      prisma.class.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.classFeeStructure.findMany(),
    ]);

    const structMap = {};
    structures.forEach((cs) => {
      structMap[`${cs.classId}_${cs.feeHeadId}`] = cs.amount;
    });

    return res.json({
      success: true,
      data: {
        classes,
        feeHeads,
        structMap,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/income/class-fee-structures/:classId
router.get('/class-fee-structures/:classId', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const feeHeads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const classStructures = await prisma.classFeeStructure.findMany({ where: { classId } });

    const structMap = {};
    classStructures.forEach((cs) => { structMap[cs.feeHeadId] = cs.amount; });

    const result = feeHeads.map((fh) => ({
      feeHeadId: fh.id,
      name: fh.name,
      nameNepali: fh.nameNepali,
      defaultAmount: fh.amount,
      classAmount: structMap[fh.id] !== undefined ? structMap[fh.id] : fh.amount,
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/class-fee-structures
router.post('/class-fee-structures', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'HEAD_TEACHER', 'TEACHER'), async (req, res) => {
  try {
    const { classId, structures } = req.body; // structures: [{ feeHeadId, amount }] or array of { classId, feeHeadId, amount }
    
    if (Array.isArray(structures)) {
      for (const item of structures) {
        const targetClassId = parseInt(item.classId || classId);
        if (!targetClassId || !item.feeHeadId) continue;

        await prisma.classFeeStructure.upsert({
          where: { classId_feeHeadId: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId) } },
          update: { amount: parseFloat(item.amount || 0) },
          create: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId), amount: parseFloat(item.amount || 0) },
        });
      }
    }

    return res.json({ success: true, message: 'Class fee structure updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── MONTHLY FEE DUES GENERATOR ──────────────────────────────────────────────
// POST /api/income/fee-dues/generate-monthly
router.post('/fee-dues/generate-monthly', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { classId, monthBs, feeHeadId, dueDateBs, sendNotice } = req.body;
    if (!monthBs) {
      return res.status(400).json({ success: false, message: 'monthBs is required.' });
    }

    const targetClassId = classId && classId !== 'ALL' ? parseInt(classId) : null;
    
    // Fetch active fee heads to generate
    let feeHeadsToProcess = [];
    if (feeHeadId && feeHeadId !== 'ALL') {
      const parsedHeadId = parseInt(feeHeadId);
      if (!isNaN(parsedHeadId)) {
        const fh = await prisma.feeHead.findUnique({ where: { id: parsedHeadId } });
        if (fh) feeHeadsToProcess.push(fh);
      }
    }

    if (feeHeadsToProcess.length === 0) {
      // Default: Find all active fee heads
      feeHeadsToProcess = await prisma.feeHead.findMany({ where: { isActive: true } });
    }

    if (feeHeadsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'No active Fee Heads found to generate dues. Please add Fee Heads first.' });
    }

    // Fetch active enrollments
    const enrollmentsWhere = { isActive: true };
    if (targetClassId) enrollmentsWhere.classId = targetClassId;

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentsWhere,
      include: {
        student: { select: { id: true, fullName: true, guardianContact: true, classEnrollment: { include: { class: true } } } },
        class: true,
      },
    });

    if (enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled active students found in the selected class.' });
    }

    let generatedCount = 0;
    for (const enroll of enrollments) {
      for (const feeHead of feeHeadsToProcess) {
        // Find class-specific fee or default fee
        const classStruct = await prisma.classFeeStructure.findUnique({
          where: { classId_feeHeadId: { classId: enroll.classId, feeHeadId: feeHead.id } },
        });
        const amount = classStruct ? classStruct.amount : feeHead.amount;

        // Skip optional 0-amount fee heads
        if (amount <= 0 && feeHead.isOptional) continue;

        // Check if due already exists
        const existing = await prisma.studentFeeDue.findFirst({
          where: { studentId: enroll.studentId, feeHeadId: feeHead.id, monthBs },
        });

        if (!existing) {
          await prisma.studentFeeDue.create({
            data: {
              studentId: enroll.studentId,
              feeHeadId: feeHead.id,
              monthBs,
              amount,
              dueDateBs: dueDateBs || `${monthBs}-30`,
              remarks: `Monthly Fee (${feeHead.name}) for ${monthBs}`,
            },
          });
          generatedCount++;

          // Send Fee Reminder Notice if requested
          if (sendNotice) {
            await prisma.notice.create({
              data: {
                title: `Fee Due Alert — ${monthBs} (${feeHead.name})`,
                body: `Dear Parent/Guardian, ${feeHead.name} of Rs. ${amount} for ${monthBs} is due for ${enroll.student.fullName}. Please clear dues online or at school office.`,
                type: 'FEE_REMINDER',
                targetStudentId: enroll.studentId,
                isAutomatic: true,
                postedDateBs: monthBs + '-15',
              },
            }).catch(() => {});
          }
        }
      }
    }

    return res.json({
      success: true,
      message: `Successfully generated fee dues for ${generatedCount} student fee records for ${monthBs}!`,
      generatedCount,
    });
  } catch (err) {
    console.error('Error generating monthly fee dues:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── STUDENT PAYMENT LEDGER (STATEMENT OF ACCOUNT) ───────────────────────────
// GET /api/income/student-ledger/:studentId
router.get('/student-ledger/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const [dues, collections, student] = await Promise.all([
      prisma.studentFeeDue.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.feeCollection.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { paidDateAd: 'asc' },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, fullName: true, fullNameNepali: true, studentId: true, phone: true, guardianContact: true },
      }),
    ]);

    // Build unified chronological ledger entries
    const duesHeadSet = new Set(dues.map(d => d.feeHeadId));
    const ledgerEntries = [];

    dues.forEach((d) => {
      ledgerEntries.push({
        id: `DUE-${d.id}`,
        dateBs: d.monthBs || d.createdAt.toISOString().slice(0, 10),
        type: 'DUE',
        particulars: `${d.feeHead?.name || 'Fee Billed'} ${d.monthBs ? `(${d.monthBs})` : ''}`,
        billedAmount: d.amount,
        paidAmount: 0,
        isPaid: d.isPaid,
        remarks: d.remarks || 'Billed Fee Due',
        createdAt: d.createdAt,
      });
    });

    collections.forEach((c) => {
      // If no separate due record existed for this feeHead, count billing implicitly with receipt
      const hasSeparateDue = duesHeadSet.has(c.feeHeadId);
      const implicitBilled = hasSeparateDue ? 0 : c.amount;

      ledgerEntries.push({
        id: `PAY-${c.id}`,
        dateBs: c.paidDateBs,
        type: 'PAYMENT',
        particulars: `Receipt No: ${c.receiptNo} — ${c.feeHead?.name || 'Fee Payment'}`,
        billedAmount: implicitBilled,
        paidAmount: c.amount,
        paymentMedium: c.paymentMedium || 'CASH',
        receiptNo: c.receiptNo,
        remarks: c.remarks || 'Fee Paid',
        createdAt: c.paidDateAd,
      });
    });

    // Sort chronologically
    ledgerEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate Running Balance
    let runningBalance = 0;
    const items = ledgerEntries.map((e) => {
      runningBalance += e.billedAmount - e.paidAmount;
      return { ...e, runningBalance: Math.max(0, runningBalance) };
    });

    const totalBilled = items.reduce((sum, item) => sum + item.billedAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    const netOutstanding = Math.max(0, totalBilled - totalPaid);

    return res.json({
      success: true,
      data: {
        student,
        items,
        totalBilled,
        totalPaid,
        netOutstanding,
        dues,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/online-pay — Student Online QR / Transfer Payment Submission
router.post('/online-pay', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, amount, paymentMedium, paymentRef, remarks } = req.body;

    const count = await prisma.feeCollection.count();
    const receiptNo = `ONLINE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const collection = await prisma.feeCollection.create({
      data: {
        studentId: parseInt(studentId),
        feeHeadId: parseInt(feeHeadId),
        amount: parseFloat(amount),
        paidDateBs: todayBS(),
        paidDateAd: new Date(),
        receiptNo,
        collectedBy: 'Online Portal / Student',
        paymentMedium: paymentMedium || 'QR_CODE',
        paymentRef,
        remarks: remarks || 'Online Fee Submission',
      },
      include: { student: true, feeHead: true },
    });

// ── INCOME ENTRIES ────────────────────────────────────────────────────────
router.get('/entries', authenticate, async (req, res) => {
  try {
    const { academicYearId, headId, categoryId, partyId, from, to, q, page = 1, limit = 100 } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = parseInt(academicYearId);
    if (headId) where.headId = parseInt(headId);
    if (partyId) where.partyId = parseInt(partyId);
    if (categoryId) where.head = { categoryId: parseInt(categoryId) };
    if (from || to) {
      where.receivedDateBs = {};
      if (from) where.receivedDateBs.gte = from;
      if (to) where.receivedDateBs.lte = to;
    }
    if (q) {
      where.OR = [
        { sourceOrg: { contains: q } },
        { voucherNo: { contains: q } },
        { receivedBy: { contains: q } },
        { chequeNo: { contains: q } },
        { head: { name: { contains: q } } },
        { party: { name: { contains: q } } },
      ];
    }
    const [entries, total] = await Promise.all([
      prisma.incomeEntry.findMany({
        where,
        include: { head: { include: { category: true } }, academicYear: true, party: true },
        orderBy: { receivedDateBs: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.incomeEntry.count({ where }),
    ]);
    const agg = await prisma.incomeEntry.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: entries, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/entries', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { receivedDateAd, headId, academicYearId, partyId, bankAccountId, amount, ...rest } = req.body;
    const entry = await prisma.incomeEntry.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        receivedDateAd: receivedDateAd ? new Date(receivedDateAd) : new Date(),
        headId: parseInt(headId),
        academicYearId: parseInt(academicYearId),
        partyId: partyId ? parseInt(partyId) : undefined,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
      },
      include: { head: { include: { category: true } }, party: true },
    });
    return res.status(201).json({ success: true, data: entry, message: 'Income entry saved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { receivedDateAd, headId, academicYearId, partyId, bankAccountId, amount, ...rest } = req.body;
    const updateData = { ...rest };
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (receivedDateAd) updateData.receivedDateAd = new Date(receivedDateAd);
    if (headId) updateData.headId = parseInt(headId);
    if (academicYearId) updateData.academicYearId = parseInt(academicYearId);
    if (partyId !== undefined) updateData.partyId = partyId ? parseInt(partyId) : null;
    if (bankAccountId !== undefined) updateData.bankAccountId = bankAccountId ? parseInt(bankAccountId) : null;

    const entry = await prisma.incomeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { head: { include: { category: true } }, party: true },
    });
    return res.json({ success: true, data: entry, message: 'Income entry updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Income entry deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
