const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/notices
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, classId, studentId } = req.query;
    const { role, teacher, student } = req.user;

    const where = { isActive: true };

    // Role-based filter
    if (role === 'STUDENT') {
      const sId = student?.id;
      const activeEnrollment = student ? await prisma.classEnrollment.findFirst({ where: { studentId: sId, isActive: true } }) : null;
      where.OR = [
        { targetRole: null },
        { targetRole: 'STUDENT' },
        { targetStudentId: sId },
        { targetClassId: activeEnrollment ? activeEnrollment.classId : undefined },
      ];
    } else if (role === 'TEACHER') {
      where.OR = [
        { targetRole: null },
        { targetRole: 'TEACHER' },
        { createdBy: req.user.id },
      ];
    }

    if (type) where.type = type;
    if (classId) where.targetClassId = parseInt(classId);
    if (studentId && ['ADMIN', 'SUPER_ADMIN', 'TEACHER'].includes(role)) {
      where.targetStudentId = parseInt(studentId);
    }

    const notices = await prisma.notice.findMany({
      where,
      include: {
        targetClass: { select: { name: true } },
        targetStudent: { select: { fullName: true, studentId: true } },
      },
      orderBy: { postedDateAd: 'desc' },
      take: 100,
    });
    return res.json({ success: true, data: notices });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notices
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { title, body, type, targetRole, targetClassId, targetStudentId, postedDateBs, sendSms } = req.body;
    const notice = await prisma.notice.create({
      data: {
        title, body,
        type: type || 'GENERAL',
        targetRole: targetRole || null,
        targetClassId: targetClassId ? parseInt(targetClassId) : null,
        targetStudentId: targetStudentId ? parseInt(targetStudentId) : null,
        postedDateBs: postedDateBs || new Date().toISOString().slice(0, 10),
        createdBy: req.user.id,
      },
    });

    // SMS hook — Sparrow SMS
    if (sendSms && targetStudentId) {
      const student = await prisma.student.findUnique({
        where: { id: parseInt(targetStudentId) },
        select: { guardianContact: true, fullName: true },
      });
      if (student?.guardianContact) {
        // Fire-and-forget SMS
        sendSparrowSms(student.guardianContact, `${title}: ${body}`).catch(console.error);
      }
    }

    return res.status(201).json({ success: true, data: notice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/notices/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.notice.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Notice removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Sparrow SMS integration
async function sendSparrowSms(to, message) {
  if (!process.env.SMS_API_KEY) return;
  const https = require('https');
  const params = new URLSearchParams({
    token: process.env.SMS_API_KEY,
    from: process.env.SMS_FROM || 'School',
    to,
    text: message,
  });
  return new Promise((resolve, reject) => {
    const url = `${process.env.SMS_API_URL}?${params.toString()}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

module.exports = router;
