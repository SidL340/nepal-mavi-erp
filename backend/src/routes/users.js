const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to generate strong readable temporary password
function generateTemporaryPassword(role = 'USER') {
  const cleanRole = (role || 'USER').replace(/[^a-zA-Z]/g, '');
  const capitalized = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  const year = '2083';
  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `${capitalized}@${year}#${randomDigits}`;
}

// ── 1. LIST USERS ────────────────────────────────────────────────────────────
// GET /api/users?role=&q=&isActive=&page=&limit=
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { role, q, isActive, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { username: { contains: search } },
        { teacher: { fullName: { contains: search } } },
        { student: { fullName: { contains: search } } },
        { student: { studentId: { contains: search } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              fullNameNepali: true,
              phone: true,
              email: true,
              type: true,
              post: true,
              photoUrl: true,
            },
          },
          student: {
            select: {
              id: true,
              studentId: true,
              fullName: true,
              fullNameNepali: true,
              phone: true,
              guardianContact: true,
              photoUrl: true,
              classEnrollment: {
                where: { isActive: true },
                select: { rollNo: true, class: { select: { id: true, name: true, section: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    // Aggregate counts by role for fast tab badges
    const [
      totalTeachers,
      totalStudents,
      totalLibrarians,
      totalAccountants,
      totalAdmins,
      pendingResetCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'LIBRARIAN' } }),
      prisma.user.count({ where: { role: 'ACCOUNTANT' } }),
      prisma.user.count({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } }),
      prisma.passwordResetRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take),
        stats: {
          totalUsers: total,
          teachers: totalTeachers,
          students: totalStudents,
          librarians: totalLibrarians,
          accountants: totalAccountants,
          admins: totalAdmins,
          pendingResetRequests: pendingResetCount,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. CREATE NEW USER ───────────────────────────────────────────────────────
// POST /api/users
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      username,
      password,
      role = 'TEACHER',
      fullName,
      phone,
      email,
      isActive = true,
      mustChangePassword = false,
      teacherId,
      studentId,
    } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username "${username}" is already in use. Please choose another username.`,
      });
    }

    // Determine initial password
    const rawPassword = password && password.trim() ? password.trim() : generateTemporaryPassword(role);
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create User record
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        role: role.toUpperCase(),
        isActive: Boolean(isActive),
        mustChangePassword: Boolean(mustChangePassword),
      },
    });

    // If teacherId provided, link teacher to this user
    if (teacherId) {
      await prisma.teacher.update({
        where: { id: parseInt(teacherId) },
        data: { userId: user.id },
      });
    }

    // If studentId provided, link student to this user
    if (studentId) {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { userId: user.id },
      });
    }

    // If creating a fresh Librarian or Staff without existing teacher profile, create basic teacher/staff record
    if (role === 'TEACHER' && !teacherId && fullName) {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          fullName: fullName.trim(),
          phone: phone || null,
          email: email || null,
          type: 'NIJI_SROTH',
          post: 'Teacher',
        },
      });
    }

    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { teacher: true, student: true },
    });

    return res.status(201).json({
      success: true,
      data: {
        user: createdUser,
        credentials: {
          username: user.username,
          temporaryPassword: rawPassword,
          role: user.role,
        },
      },
      message: `User account for "${user.username}" created successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. UPDATE USER ───────────────────────────────────────────────────────────
// PUT /api/users/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, role, isActive, mustChangePassword } = req.body;

    const data = {};
    if (username) data.username = username.trim();
    if (role) data.role = role.toUpperCase();
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (mustChangePassword !== undefined) data.mustChangePassword = Boolean(mustChangePassword);

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { teacher: true, student: true },
    });

    return res.json({
      success: true,
      data: updated,
      message: `User "${updated.username}" updated successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CHANGE MY OWN PASSWORD ──────────────────────────────────────────────────
// POST /api/users/change-my-password
router.post('/change-my-password', authenticate, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return res.json({ success: true, message: 'Your password has been changed successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. ADMIN RESET USER PASSWORD ────────────────────────────────────────────
// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { newPassword } = req.body;
    const rawPassword = newPassword && newPassword.trim() ? newPassword.trim() : generateTemporaryPassword(user.role);
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Also mark any open reset request for this user as RESOLVED
    await prisma.passwordResetRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: {
        status: 'RESOLVED',
        temporaryPassword: rawPassword,
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
        adminNotes: 'Password reset directly by Administrator.',
      },
    });

    const displayName = user.teacher?.fullName || user.student?.fullName || user.username;

    return res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        displayName,
        role: user.role,
        temporaryPassword: rawPassword,
      },
      message: `Password for "${user.username}" (${displayName}) was reset successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4B. BULK RESET ALL PASSWORDS ─────────────────────────────────────────────
// POST /api/users/bulk-reset-passwords
router.post('/bulk-reset-passwords', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { targetRole = 'ALL', classId } = req.body;
    const where = { isActive: true };

    if (targetRole && targetRole !== 'ALL') {
      where.role = targetRole;
    }
    // Exclude current logged in admin from accidental mass reset
    where.id = { not: req.user.id };

    const usersToReset = await prisma.user.findMany({
      where,
      include: {
        teacher: { select: { fullName: true, phone: true } },
        student: {
          select: {
            fullName: true,
            studentId: true,
            classEnrollment: {
              where: { isActive: true },
              select: { rollNo: true, class: { select: { id: true, name: true, section: true } } },
            },
          },
        },
      },
    });

    const resetTasks = usersToReset.map(async (u) => {
      if (classId && u.role === 'STUDENT') {
        const studentClassId = u.student?.classEnrollment?.[0]?.class?.id;
        if (studentClassId !== parseInt(classId)) return null;
      }

      const rollNo = u.student?.classEnrollment?.[0]?.rollNo || u.id;
      const rawPassword = u.role === 'STUDENT' ? `SSB@${rollNo}` : generateTemporaryPassword(u.role);
      const passwordHash = await bcrypt.hash(rawPassword, 6);

      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash, mustChangePassword: true },
      });

      const className = u.student?.classEnrollment?.[0]?.class
        ? `${u.student.classEnrollment[0].class.name} (${u.student.classEnrollment[0].class.section || 'A'})`
        : u.teacher?.post || u.role;

      return {
        id: u.id,
        username: u.username,
        role: u.role,
        fullName: u.teacher?.fullName || u.student?.fullName || u.username,
        studentId: u.student?.studentId || '—',
        className,
        rollNo,
        temporaryPassword: rawPassword,
      };
    });

    const results = await Promise.all(resetTasks);
    const resetResults = results.filter(Boolean);

    return res.json({
      success: true,
      data: resetResults,
      count: resetResults.length,
      message: `Successfully reset passwords for ${resetResults.length} users!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. DELETE / DEACTIVATE USER ─────────────────────────────────────────────
// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account.' });
    }

    // Toggle active status or soft delete
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    return res.json({
      success: true,
      data: updated,
      message: `User "${user.username}" has been ${updated.isActive ? 'activated' : 'deactivated'}.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. PASSWORD RESET REQUESTS QUEUE ─────────────────────────────────────────
// GET /api/users/reset-requests/list?status=
router.get('/reset-requests/list', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.passwordResetRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            teacher: { select: { fullName: true, phone: true } },
            student: { select: { fullName: true, studentId: true, phone: true, guardianContact: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/reset-requests/:id/resolve
router.post('/reset-requests/:id/resolve', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { action = 'APPROVE', adminNotes, newPassword } = req.body;

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Reset request not found.' });
    }

    if (action === 'REJECT') {
      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || 'Rejected by Administrator.',
          resolvedAt: new Date(),
          resolvedBy: req.user.id,
        },
      });
      return res.json({
        success: true,
        data: updated,
        message: 'Password reset request was rejected.',
      });
    }

    // Action === 'APPROVE'
    // Find target user either via userId relation or matching identifier
    let targetUser = request.user;
    if (!targetUser && request.userId) {
      targetUser = await prisma.user.findUnique({ where: { id: request.userId } });
    }
    if (!targetUser && request.identifier) {
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: request.identifier.trim() },
            { student: { studentId: request.identifier.trim() } },
            { student: { emisId: request.identifier.trim() } },
            { teacher: { phone: request.identifier.trim() } },
          ],
        },
        include: { teacher: true, student: true },
      });
    }

    if (!targetUser) {
      return res.status(400).json({
        success: false,
        message: `Could not automatically locate user account for "${request.identifier}". Please verify user account from User list.`,
      });
    }

    const rawPassword = newPassword && newPassword.trim()
      ? newPassword.trim()
      : generateTemporaryPassword(targetUser.role || request.role);

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Update request record
    const updatedRequest = await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'RESOLVED',
        userId: targetUser.id,
        temporaryPassword: rawPassword,
        adminNotes: adminNotes || 'Approved and reset by Administrator.',
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
      },
    });

    return res.json({
      success: true,
      data: {
        request: updatedRequest,
        credentials: {
          username: targetUser.username,
          temporaryPassword: rawPassword,
          role: targetUser.role,
          displayName: request.fullName || targetUser.username,
        },
      },
      message: `Password for "${targetUser.username}" was reset successfully! Temporary password generated.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
