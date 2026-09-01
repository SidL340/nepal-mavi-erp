const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required.' });

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        teacher: { select: { id: true, fullName: true, photoUrl: true } },
        student: { select: { id: true, fullName: true, studentId: true, photoUrl: true } },
      },
    });

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        teacher: user.teacher,
        student: user.student,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = req.user;
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      teacher: user.teacher,
      student: user.student,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const valid = await bcrypt.compare(oldPassword, req.user.passwordHash);
    if (!valid)
      return res.status(400).json({ success: false, message: 'Old password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hash, mustChangePassword: false },
    });
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/reset-password (Admin only - resets any user password)
router.post('/reset-password', authenticate, async (req, res) => {
  try {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    const { userId, newPassword } = req.body;
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: true },
    });
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/request-password-reset (Public — any user can request a password reset)
router.post('/request-password-reset', async (req, res) => {
  try {
    const { identifier, fullName, role, contactInfo, reason } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username, Student ID, Email, or Phone number is required to request a password reset.',
      });
    }

    const cleanIdentifier = identifier.trim();

    // Try to find matching user
    const matchedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { student: { studentId: cleanIdentifier } },
          { student: { emisId: cleanIdentifier } },
          { teacher: { phone: cleanIdentifier } },
          { teacher: { email: cleanIdentifier } },
        ],
      },
      include: { teacher: true, student: true },
    });

    const finalFullName =
      fullName ||
      matchedUser?.teacher?.fullName ||
      matchedUser?.student?.fullName ||
      'Self-Service User';

    const finalRole = role || matchedUser?.role || 'STUDENT';

    const newRequest = await prisma.passwordResetRequest.create({
      data: {
        userId: matchedUser ? matchedUser.id : null,
        identifier: cleanIdentifier,
        fullName: finalFullName,
        role: finalRole,
        contactInfo: contactInfo || matchedUser?.teacher?.phone || matchedUser?.student?.phone || null,
        reason: reason || 'Forgot password request submitted by user.',
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Password reset request submitted successfully! School administrator or class teacher has been notified.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to submit reset request.' });
  }
});

module.exports = router;
