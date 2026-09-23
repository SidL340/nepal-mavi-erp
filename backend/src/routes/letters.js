const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/letters — list all letters / memos
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, q, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { subject: { contains: q } },
        { recipient: { contains: q } },
        { chalaniNo: { contains: q } },
        { patraSankhya: { contains: q } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [letters, total] = await Promise.all([
      prisma.schoolLetter.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.schoolLetter.count({ where }),
    ]);

    return res.json({ success: true, data: letters, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/letters/:id — get letter by id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const letter = await prisma.schoolLetter.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!letter) return res.status(404).json({ success: false, message: 'Letter not found.' });
    return res.json({ success: true, data: letter });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/letters — draft a new letter on letterpad
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      chalaniNo,
      patraSankhya,
      letterDateBs,
      letterDateAd,
      subject,
      recipient,
      recipientAddress,
      body,
      salutation,
      signatoryName,
      signatoryPost,
      headerType,
      status,
    } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, message: 'पत्रको विषय अनिवार्य छ (Subject is required).' });
    }
    if (!recipient || !String(recipient).trim()) {
      return res.status(400).json({ success: false, message: 'पत्र पाउने व्यक्ति/संस्था अनिवार्य छ (Recipient is required).' });
    }

    // Auto-generate Chalani number if blank
    let finalChalani = chalaniNo ? String(chalaniNo).trim() : null;
    if (!finalChalani) {
      const count = await prisma.schoolLetter.count();
      const yr = letterDateBs ? letterDateBs.slice(0, 4) : '2081';
      finalChalani = `चलानी-${yr}/${String(count + 1).padStart(3, '0')}`;
    }

    const letter = await prisma.schoolLetter.create({
      data: {
        chalaniNo: finalChalani,
        patraSankhya: patraSankhya || '०८१/०८२',
        letterDateBs: letterDateBs || '2081-01-01',
        letterDateAd: letterDateAd ? new Date(letterDateAd) : new Date(),
        subject: String(subject).trim(),
        recipient: String(recipient).trim(),
        recipientAddress: recipientAddress ? String(recipientAddress).trim() : null,
        body: body ? String(body).trim() : '',
        salutation: salutation || 'महोदय / श्रीमान्,',
        signatoryName: signatoryName || 'प्रधानाध्यापक',
        signatoryPost: signatoryPost || 'प्रधानाध्यापक (Headmaster)',
        headerType: headerType || 'OFFICIAL',
        status: status || 'ISSUED',
      },
    });

    return res.status(201).json({ success: true, data: letter, message: 'पत्र/लेटरप्याड सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/letters/:id — update letter
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const letterId = parseInt(req.params.id);
    const {
      chalaniNo,
      patraSankhya,
      letterDateBs,
      letterDateAd,
      subject,
      recipient,
      recipientAddress,
      body,
      salutation,
      signatoryName,
      signatoryPost,
      headerType,
      status,
    } = req.body;

    const letter = await prisma.schoolLetter.update({
      where: { id: letterId },
      data: {
        ...(chalaniNo !== undefined && { chalaniNo }),
        ...(patraSankhya !== undefined && { patraSankhya }),
        ...(letterDateBs !== undefined && { letterDateBs }),
        ...(letterDateAd && { letterDateAd: new Date(letterDateAd) }),
        ...(subject !== undefined && { subject: String(subject).trim() }),
        ...(recipient !== undefined && { recipient: String(recipient).trim() }),
        ...(recipientAddress !== undefined && { recipientAddress }),
        ...(body !== undefined && { body: String(body).trim() }),
        ...(salutation !== undefined && { salutation }),
        ...(signatoryName !== undefined && { signatoryName }),
        ...(signatoryPost !== undefined && { signatoryPost }),
        ...(headerType !== undefined && { headerType }),
        ...(status !== undefined && { status }),
      },
    });

    return res.json({ success: true, data: letter, message: 'पत्र सफलतापूर्वक अद्यावधिक भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/letters/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.schoolLetter.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'पत्र सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
