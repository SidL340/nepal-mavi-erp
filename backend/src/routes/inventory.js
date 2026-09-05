const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── INVENTORY CATEGORIES ──────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.inventoryCategory.findMany({ include: { _count: { select: { items: true } } } });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const cat = await prisma.inventoryCategory.create({ data: { name: req.body.name } });
    return res.status(201).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INVENTORY ITEMS ───────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  try {
    const { categoryId, condition, search } = req.query;
    const where = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (condition) where.condition = condition;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const items = await prisma.inventoryItem.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        ...req.body,
        categoryId: parseInt(req.body.categoryId),
        quantity: parseInt(req.body.quantity || 1),
        purchaseAmount: req.body.purchaseAmount ? parseFloat(req.body.purchaseAmount) : null,
      },
      include: { category: true },
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.categoryId) data.categoryId = parseInt(data.categoryId);
    if (data.quantity !== undefined) data.quantity = parseInt(data.quantity);
    if (data.purchaseAmount !== undefined) data.purchaseAmount = data.purchaseAmount ? parseFloat(data.purchaseAmount) : null;

    const item = await prisma.inventoryItem.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { category: true },
    });
    return res.json({ success: true, data: item, message: 'Inventory item updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Inventory item deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Inventory item deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
