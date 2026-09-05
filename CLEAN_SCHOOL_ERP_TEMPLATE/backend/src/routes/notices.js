const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// No-cache headers
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

// ── GET /api/notices ──────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, classId, studentId } = req.query;
    const { role, teacher, student } = req.user;

    const where = { isActive: true };

    if (role === 'STUDENT') {
      const sId = student?.id;
      const activeEnrollment = student
        ? await prisma.classEnrollment.findFirst({ where: { studentId: sId, isActive: true } })
        : null;
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
      take: 200,
    });
    return res.json({ success: true, data: notices });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/notices ─────────────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { title, body, type, targetRole, targetClassId, targetStudentId, postedDateBs, sendSms } = req.body;
    const notice = await prisma.notice.create({
      data: {
        title,
        body,
        type: type || 'GENERAL',
        targetRole: targetRole || null,
        targetClassId: targetClassId ? parseInt(targetClassId) : null,
        targetStudentId: targetStudentId ? parseInt(targetStudentId) : null,
        postedDateBs: postedDateBs || new Date().toISOString().slice(0, 10),
        createdBy: req.user.id,
      },
    });

    if (sendSms && targetStudentId) {
      const student = await prisma.student.findUnique({
        where: { id: parseInt(targetStudentId) },
        select: { guardianContact: true, fullName: true },
      });
      if (student?.guardianContact) {
        sendSparrowSms(student.guardianContact, `${title}: ${body}`).catch(console.error);
      }
    }

    return res.status(201).json({ success: true, data: notice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/notices/:id — Edit Notice ────────────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const { title, body, type, targetRole, targetClassId, targetStudentId } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (body !== undefined) updateData.body = body;
    if (type !== undefined) updateData.type = type;
    if (targetRole !== undefined) updateData.targetRole = targetRole || null;
    if (targetClassId !== undefined) updateData.targetClassId = targetClassId ? parseInt(targetClassId) : null;
    if (targetStudentId !== undefined) updateData.targetStudentId = targetStudentId ? parseInt(targetStudentId) : null;

    const updated = await prisma.notice.update({ where: { id }, data: updateData });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/notices/:id ───────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.notice.update({ where: { id }, data: { isActive: false } });
    return res.json({ success: true, message: 'Notice removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/notices/:id/delete — Proxy-proof DELETE fallback ───────────────
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.notice.update({ where: { id }, data: { isActive: false } });
    return res.json({ success: true, message: 'Notice removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/notices/absent-alert — Bulk absent student alert ────────────────
// Receives: { classId, dateBs, customMessage } → Creates individual notices for each absent student
router.post('/absent-alert', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { classId, dateBs, customMessage } = req.body;
    if (!classId || !dateBs) {
      return res.status(400).json({ success: false, message: 'classId and dateBs are required.' });
    }

    // Fetch absent/bunked students for this date and class
    const absences = await prisma.attendance.findMany({
      where: {
        classId: parseInt(classId),
        dateBs,
        status: { in: ['ABSENT', 'BUNKED'] },
      },
      include: {
        student: {
          select: { id: true, fullName: true, guardianContact: true, studentId: true },
        },
        class: { select: { name: true } },
      },
    });

    if (absences.length === 0) {
      return res.json({ success: true, message: 'No absent students found for this date.', count: 0 });
    }

    let sentCount = 0;
    const createdNotices = [];

    for (const att of absences) {
      const student = att.student;
      const className = att.class?.name || 'Class';
      const message = customMessage ||
        `Dear Guardian, your ward ${student.fullName} (${student.studentId || ''}) was ABSENT in ${className} on ${dateBs} BS. Please contact the school for further information.`;

      const notice = await prisma.notice.create({
        data: {
          title: `Absence Alert: ${student.fullName}`,
          body: message,
          type: 'ABSENT_ALERT',
          targetStudentId: student.id,
          isAutomatic: true,
          postedDateBs: dateBs,
          createdBy: req.user.id,
        },
      });
      createdNotices.push(notice);
      sentCount++;

      // Optional SMS
      if (student.guardianContact && process.env.SMS_API_KEY) {
        sendSparrowSms(student.guardianContact, message).catch(console.error);
      }
    }

    return res.json({
      success: true,
      message: `Absent alerts sent for ${sentCount} student(s).`,
      count: sentCount,
      data: createdNotices,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/notices/exam-alert — Send exam notice to all enrolled students ──
router.post('/exam-alert', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { title, body, classId, postedDateBs } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required.' });
    }

    // Create one exam notice — targeted to class or general
    const notice = await prisma.notice.create({
      data: {
        title,
        body,
        type: 'EXAM',
        targetClassId: classId ? parseInt(classId) : null,
        targetRole: classId ? null : 'STUDENT',
        postedDateBs: postedDateBs || new Date().toISOString().slice(0, 10),
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ success: true, data: notice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Sparrow SMS helper ────────────────────────────────────────────────────────
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
