const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const { getFiscalYearFromBS } = require('./financialYears');

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

    // Populate full accurate voucher count combining partyId and name text matches
    const updatedParties = await Promise.all(
      parties.map(async (p) => {
        const [expCount, incCount] = await Promise.all([
          prisma.expenseEntry.count({
            where: {
              OR: [{ partyId: p.id }, { paidTo: { contains: p.name } }]
            }
          }),
          prisma.incomeEntry.count({
            where: {
              OR: [{ partyId: p.id }, { sourceOrg: { contains: p.name } }]
            }
          })
        ]);

        return {
          ...p,
          vouchersCount: expCount + incCount,
          _count: {
            expenseEntries: expCount,
            incomeEntries: incCount,
          }
        };
      })
    );

    return res.json({ success: true, data: updatedParties });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET COMPREHENSIVE ACCOUNTS PAYABLE & VENDOR DUES SUMMARY ─────────────────
router.get('/payables-summary', authenticate, async (req, res) => {
  try {
    const { partyId, financialYearId, status } = req.query;

    const where = {
      billNo: { not: null },
    };
    if (partyId) where.partyId = parseInt(partyId);

    const entries = await prisma.expenseEntry.findMany({
      where,
      include: {
        party: true,
        head: { include: { category: true } },
        financialYear: true,
      },
      orderBy: { expenseDateBs: 'asc' },
    });

    const payableBillsMap = new Map();
    for (const e of entries) {
      if (!e.billNo || !e.billNo.trim()) continue;
      const cleanBill = e.billNo.trim();
      const pKey = `${e.partyId || 'direct'}_${cleanBill}`;

      if (!payableBillsMap.has(pKey)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,]+)\]/i);
        if (match) {
          parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        }

        const billFy = e.financialYear?.year || getFiscalYearFromBS(e.expenseDateBs);

        payableBillsMap.set(pKey, {
          key: pKey,
          billNo: cleanBill,
          billDateBs: e.expenseDateBs,
          billFinancialYear: billFy,
          billFinancialYearId: e.financialYearId,
          partyId: e.partyId,
          party: e.party,
          partyName: e.party?.name || e.paidTo || 'Vendor / Supplier',
          panNo: e.party?.panNo || '',
          phone: e.party?.phone || '',
          headId: e.headId,
          head: e.head,
          headName: e.head?.name || 'Expense Head',
          totalBillAmount: parsedTotal,
          totalPaidAmount: 0,
          description: e.description,
          installments: [],
        });
      }

      const bill = payableBillsMap.get(pKey);
      bill.totalPaidAmount += (e.amount || 0);
      if (bill.totalPaidAmount > bill.totalBillAmount) {
        bill.totalBillAmount = bill.totalPaidAmount;
      }
      bill.installments.push({
        id: e.id,
        voucherNo: e.voucherNo,
        amount: e.amount,
        expenseDateBs: e.expenseDateBs,
        financialYear: e.financialYear?.year || getFiscalYearFromBS(e.expenseDateBs),
        financialYearId: e.financialYearId,
        paymentMedium: e.paymentMedium,
        chequeNo: e.chequeNo,
        chequePayeeName: e.chequePayeeName,
        paidFromAccount: e.paidFromAccount,
        description: e.description,
        remarks: e.remarks,
      });
    }

    let bills = Array.from(payableBillsMap.values()).map(b => {
      const remainingDue = Math.max(0, b.totalBillAmount - b.totalPaidAmount);
      let billStatus = 'FULLY_PAID';
      if (remainingDue > 0 && b.totalPaidAmount > 0) billStatus = 'PARTIAL';
      else if (b.totalPaidAmount === 0 || remainingDue === b.totalBillAmount) billStatus = 'UNPAID';
      return {
        ...b,
        remainingDue,
        status: billStatus,
      };
    });

    if (financialYearId) {
      const fyIdNum = parseInt(financialYearId);
      bills = bills.filter(b => 
        b.billFinancialYearId === fyIdNum || 
        b.installments.some(inst => inst.financialYearId === fyIdNum)
      );
    }

    if (status && status !== 'ALL') {
      bills = bills.filter(b => b.status === status);
    }

    // Party-Wise Aggregation
    const partyAggMap = new Map();
    for (const b of bills) {
      const pId = b.partyId || 0;
      if (!partyAggMap.has(pId)) {
        partyAggMap.set(pId, {
          partyId: b.partyId,
          party: b.party,
          partyName: b.partyName,
          panNo: b.panNo,
          phone: b.phone,
          totalBillsCount: 0,
          totalBillsAmount: 0,
          totalPaidAmount: 0,
          totalOutstandingDue: 0,
          pendingBillsCount: 0,
          bills: [],
        });
      }

      const pGroup = partyAggMap.get(pId);
      pGroup.totalBillsCount += 1;
      pGroup.totalBillsAmount += b.totalBillAmount;
      pGroup.totalPaidAmount += b.totalPaidAmount;
      pGroup.totalOutstandingDue += b.remainingDue;
      if (b.remainingDue > 0) pGroup.pendingBillsCount += 1;
      pGroup.bills.push(b);
    }

    const partySummary = Array.from(partyAggMap.values());
    const totalPayables = bills.reduce((s, b) => s + b.totalBillAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.totalPaidAmount, 0);
    const totalOutstandingDue = bills.reduce((s, b) => s + b.remainingDue, 0);
    const pendingBillsCount = bills.filter(b => b.remainingDue > 0).length;
    const partiesWithDuesCount = partySummary.filter(p => p.totalOutstandingDue > 0).length;

    return res.json({
      success: true,
      data: {
        summary: {
          totalBillsCount: bills.length,
          totalPayables,
          totalPaid,
          totalOutstandingDue,
          pendingBillsCount,
          partiesWithDuesCount,
        },
        bills,
        partySummary,
      }
    });
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
