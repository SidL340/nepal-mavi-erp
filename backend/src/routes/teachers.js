const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET /api/teachers
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { panNo: { contains: search } },
      ];
    }
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: { select: { username: true, isActive: true } },
        subjects: { include: { subject: true } },
        classTeacherOf: { select: { id: true, name: true, section: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    return res.json({ success: true, data: teachers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/teachers/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
        subjects: { include: { subject: true } },
        classTeacherOf: true,
        payrolls: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    return res.json({ success: true, data: teacher });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/teachers
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fullName, fullNameNepali, gender, dateOfBirthBs, address, phone, email,
      panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
      type, taha, shreni, post, designation,
      dateOfJoiningBs, dateOfRetirementBs, subjectIds
    } = req.body;

    const username = (fullName.toLowerCase().replace(/\s+/g, '.') + '.' + Date.now()).slice(0, 20);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: 'TEACHER', mustChangePassword: true },
      });
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id, fullName, fullNameNepali, gender, dateOfBirthBs, address, phone, email,
          panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
          type: type || 'RASTRIYA', taha, shreni, post, designation,
          dateOfJoiningBs, dateOfRetirementBs,
          subjects: subjectIds ? {
            create: subjectIds.map(sid => ({ subjectId: sid }))
          } : undefined,
        },
      });
      return { teacher, plainPassword, username };
    });

    return res.status(201).json({
      success: true,
      data: result.teacher,
      credentials: { username: result.username, password: result.plainPassword },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { subjectIds, ...rest } = req.body;
    const teacher = await prisma.teacher.update({
      where: { id: parseInt(req.params.id) },
      data: rest,
    });
    if (subjectIds) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      await prisma.teacherSubject.createMany({
        data: subjectIds.map(sid => ({ teacherId: teacher.id, subjectId: sid })),
      });
    }
    return res.json({ success: true, data: teacher });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/teachers/:id (soft)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.teacher.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Teacher deactivated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
