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
    const { type, category, search } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    if (category) {
      if (category === 'NON_TEACHING') {
        where.shreni = 'NON_TEACHING';
      } else if (category === 'TEACHING') {
        where.OR = [
          { shreni: 'TEACHING' },
          { shreni: null },
          { shreni: '' },
        ];
      }
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { fullNameNepali: { contains: search } },
        { panNo: { contains: search } },
        { phone: { contains: search } },
        { post: { contains: search } },
      ];
    }
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
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
    if (!teacher) return res.status(404).json({ success: false, message: 'Staff/Teacher not found.' });
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
      type, taha, shreni, post, designation, photoUrl,
      dateOfJoiningBs, dateOfRetirementBs, subjectIds, role
    } = req.body;

    const username = (fullName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + '.' + Date.now().toString().slice(-4)).slice(0, 20);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const userRole = role && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'LIBRARIAN', 'STUDENT'].includes(role)
      ? role
      : (shreni === 'NON_TEACHING' && post?.toLowerCase().includes('account') ? 'ACCOUNTANT' : 'TEACHER');

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: userRole, mustChangePassword: true },
      });
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id, fullName, fullNameNepali, gender, dateOfBirthBs, address, phone, email,
          panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
          type: type || 'RASTRIYA',
          taha,
          shreni: shreni || 'TEACHING',
          post: post || (shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक'),
          designation,
          photoUrl: photoUrl || null,
          dateOfJoiningBs, dateOfRetirementBs,
          subjects: (subjectIds && subjectIds.length > 0) ? {
            create: subjectIds.map(sid => ({ subjectId: parseInt(sid) }))
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
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit your own details.' });
    }

    const { subjectIds, role, ...rest } = req.body;
    const teacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: rest,
    });

    if (role && teacher.userId && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { role },
      });
    }

    if (subjectIds !== undefined && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      if (Array.isArray(subjectIds) && subjectIds.length > 0) {
        await prisma.teacherSubject.createMany({
          data: subjectIds.map(sid => ({ teacherId: teacher.id, subjectId: parseInt(sid) })),
        });
      }
    }
    return res.json({ success: true, data: teacher, message: 'Staff details updated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    // Clean up class teacher assignment
    await prisma.class.updateMany({
      where: { classTeacherId: teacherId },
      data: { classTeacherId: null },
    });

    // Delete teacher subject mappings
    await prisma.teacherSubject.deleteMany({ where: { teacherId } });

    // Delete teacher record
    await prisma.teacher.delete({ where: { id: teacherId } });

    // Delete user account if associated
    if (teacher.userId) {
      await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {});
    }

    return res.json({ success: true, message: 'Teacher record deleted permanently.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
