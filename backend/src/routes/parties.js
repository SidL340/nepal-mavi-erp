const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── GET ALL PARTIES / RECIPIENTS ──────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, type } = req.query;
    const where = { isActive: true };
    if (type && type !== 'ALL') where.partyType = type;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nameNepali: { contains: q } },
        { panNo: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const parties = await prisma.party.findMany({
      where,
      include: {
        _count: {
          select: { expenseEntries: true, incomeEntries: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: parties });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE PARTY WITH PARTY-WISE VOUCHERS / TRANSACTIONS ─────────────────
router.get('/:id/vouchers', authenticate, async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    const party = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party/Recipient not found.' });
    }

    const [expenses, incomes] = await Promise.all([
      prisma.expenseEntry.findMany({
        where: {
          OR: [
            { partyId },
            { paidTo: { contains: party.name } }
          ]
        },
        include: { head: { include: { category: true } } },
        orderBy: { expenseDateBs: 'desc' },
      }),
      prisma.incomeEntry.findMany({
        where: {
          OR: [
            { partyId },
            { sourceOrg: { contains: party.name } }
          ]
        },
        include: { head: { include: { category: true } } },
        orderBy: { receivedDateBs: 'desc' },
      }),
    ]);

    const totalExpenseSum = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncomeSum = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

    return res.json({
      success: true,
      data: {
        party,
        expenses,
        incomes,
        totalExpenseSum,
        totalIncomeSum,
        totalVoucherCount: expenses.length + incomes.length,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE PARTY / RECIPIENT ──────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, partyType, panNo, phone, email, address, bankName, accountNo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Party Name is required.' });
    }

    const party = await prisma.party.create({
      data: {
        name: name.trim(),
        nameNepali: nameNepali ? nameNepali.trim() : null,
        partyType: partyType || 'VENDOR',
        panNo: panNo ? panNo.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        bankName: bankName ? bankName.trim() : null,
        accountNo: accountNo ? accountNo.trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: party, message: 'Party/Recipient saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE PARTY ─────────────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const party = await prisma.party.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    return res.json({ success: true, data: party, message: 'Party updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE (DEACTIVATE) PARTY ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.party.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    return res.json({ success: true, message: 'Party deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
