const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/events — Fetch events with optional monthBs / dateBs / yearBs filter
router.get('/', authenticate, async (req, res) => {
  try {
    const { monthBs, dateBs, yearBs, targetAudience, limit = 100 } = req.query;
    const where = { isActive: true };

    if (dateBs) {
      where.eventDateBs = dateBs;
    } else if (monthBs) {
      where.eventDateBs = { startsWith: monthBs };
    } else if (yearBs) {
      where.eventDateBs = { startsWith: yearBs };
    }

    if (targetAudience && targetAudience !== 'ALL') {
      where.targetAudience = { in: ['ALL', targetAudience] };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { eventDateBs: 'asc' },
      take: parseInt(limit),
    });

    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/today?dateBs=2083-05-15 — Fetch today's specific events & holidays
router.get('/today', authenticate, async (req, res) => {
  try {
    const { dateBs } = req.query;
    if (!dateBs) {
      return res.status(400).json({ success: false, message: 'dateBs is required.' });
    }

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        eventDateBs: dateBs,
      },
    });

    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events — Create Event (Admin Only)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { title, titleNepali, description, eventDateBs, endDateBs, eventType, targetAudience, isHoliday } = req.body;
    if (!title || !eventDateBs) {
      return res.status(400).json({ success: false, message: 'Title and eventDateBs are required.' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        titleNepali,
        description,
        eventDateBs,
        eventDateAd: new Date(),
        endDateBs,
        eventType: eventType || 'ACADEMIC',
        targetAudience: targetAudience || 'ALL',
        isHoliday: Boolean(isHoliday),
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ success: true, data: event, message: 'Event created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:id — Update Event (Admin Only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, titleNepali, description, eventDateBs, endDateBs, eventType, targetAudience, isHoliday } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        titleNepali,
        description,
        eventDateBs,
        endDateBs,
        eventType,
        targetAudience,
        isHoliday: isHoliday !== undefined ? Boolean(isHoliday) : undefined,
      },
    });

    return res.json({ success: true, data: event, message: 'Event updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/events/:id — Soft Delete Event (Admin Only)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
