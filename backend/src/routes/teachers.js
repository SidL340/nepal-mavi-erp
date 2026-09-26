const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_INCHARGE_TASKS } = require('./staff-tasks');

const router = express.Router();

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET /api/teachers
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, category, inchargeRole, search, includeInactive, all, status } = req.query;
    const where = {};
    if (includeInactive !== 'true' && all !== 'true' && !status) {
      where.isActive = true;
    } else if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE' || status === 'TRANSFERRED' || status === 'RETIRED' || status === 'LEFT') {
      where.isActive = false;
    }

    if (type) where.type = type;
    if (inchargeRole) {
      where.inchargeRole = { contains: inchargeRole };
    }
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
        { inchargeTitle: { contains: search } },
      ];
    }
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
        subjects: { include: { subject: true } },
        classTeacherOf: { select: { id: true, name: true, section: true } },
        tasks: {
          select: { id: true, title: true, status: true, priority: true, category: true, dueDateBs: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: req.query.sortBy === 'name' ? { fullName: 'asc' } : { id: 'asc' },
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
        tasks: { orderBy: { createdAt: 'desc' } },
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
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      fullName, fullNameNepali, gender, bloodGroup, dateOfBirthBs, address, phone, email,
      panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
      type, taha, shreni, post, designation, photoUrl,
      isTeachingStaff,
      dateOfJoiningBs, dateOfRetirementBs, subjectIds, role,
      isActive, enableLogin, isHistorical
    } = req.body;

    const username = (fullName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + '.' + Date.now().toString().slice(-4)).slice(0, 20);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    let userRole = role;
    if (!userRole || !['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'LIBRARIAN', 'STUDENT'].includes(userRole)) {
      if (shreni === 'NON_TEACHING' && post?.toLowerCase().includes('account')) {
        userRole = 'ACCOUNTANT';
      } else if (shreni === 'NON_TEACHING' && post?.toLowerCase().includes('library')) {
        userRole = 'LIBRARIAN';
      } else {
        userRole = 'TEACHER';
      }
    }

    const staffIsActive = isActive !== undefined ? Boolean(isActive) : !Boolean(isHistorical);
    const userIsActive = enableLogin !== undefined ? Boolean(enableLogin) : staffIsActive;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: userRole, isActive: userIsActive, mustChangePassword: true },
      });
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id, fullName, fullNameNepali, gender, bloodGroup: bloodGroup || null, dateOfBirthBs, address, phone, email,
          panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
          type: type || 'RASTRIYA',
          isTeachingStaff: isTeachingStaff !== undefined ? Boolean(isTeachingStaff) : (shreni !== 'NON_TEACHING'),
          taha,
          shreni: shreni || 'TEACHING',
          post: post || (shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक'),
          designation,
          photoUrl: photoUrl || null,
          dateOfJoiningBs, dateOfRetirementBs,
          isActive: staffIsActive,
          subjects: (subjectIds && subjectIds.length > 0) ? {
            create: subjectIds.map(sid => ({ subjectId: parseInt(sid) }))
          } : undefined,
        },
      });
      return { teacher, plainPassword, username, userIsActive };
    });

    return res.status(201).json({
      success: true,
      data: result.teacher,
      credentials: result.userIsActive ? { username: result.username, password: result.plainPassword } : null,
      message: result.userIsActive ? 'शिक्षक/कर्मचारी दर्ता भयो (Login Portal सक्रिय)' : 'विगत/पूर्व शिक्षक/कर्मचारी अभिलेख सुरक्षित गरियो (Login Portal निष्कृय)',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PATCH /api/teachers/:id/status - Update staff status (Active, Transferred, Retired, Resigned, Left)
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const { isActive, statusReason, dateOfRetirementBs, exitRemarks, disableLogin } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher/Staff not found.' });

    const isStaffActive = Boolean(isActive);

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      const t = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          isActive: isStaffActive,
          statusReason: statusReason !== undefined ? statusReason : (isStaffActive ? null : teacher.statusReason),
          exitRemarks: exitRemarks !== undefined ? exitRemarks : (isStaffActive ? null : teacher.exitRemarks),
          dateOfRetirementBs: dateOfRetirementBs !== undefined ? dateOfRetirementBs : (isStaffActive ? null : teacher.dateOfRetirementBs),
        },
      });

      // If retiring/transferring out, safely unassign as active class teacher
      if (!isStaffActive) {
        await tx.class.updateMany({
          where: { classTeacherId: teacherId },
          data: { classTeacherId: null },
        });
      }

      // Handle User Portal Login status
      if (teacher.userId) {
        const shouldUserBeActive = isStaffActive ? (disableLogin !== true) : (disableLogin === false);
        await tx.user.update({
          where: { id: teacher.userId },
          data: { isActive: shouldUserBeActive },
        });
      }

      return t;
    });

    return res.json({
      success: true,
      data: updatedTeacher,
      message: isStaffActive
        ? 'शिक्षक/कर्मचारी पुनः कार्यरत (Active) सेवामा अद्यावधिक गरियो।'
        : `शिक्षक/कर्मचारीको स्थिति अद्यावधिक गरियो (${statusReason || 'सरुवा/अवकाश'})।`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Status update failed: ' + err.message });
  }
});

// POST /api/teachers/:id/assign-role - Assign Special Incharge Roles (Checkboxes) & auto create tasks
router.post('/:id/assign-role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const { inchargeRoles, inchargeRole, inchargeTitle, syncUserRole, autoCreateTasks, dueDateBs } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Staff member not found.' });

    // Extract roles array from multi-select checkboxes or string
    let rolesArray = [];
    if (Array.isArray(inchargeRoles)) {
      rolesArray = inchargeRoles.filter(Boolean);
    } else if (typeof inchargeRole === 'string' && inchargeRole.trim() && inchargeRole !== 'NONE') {
      rolesArray = inchargeRole.split(',').map(r => r.trim()).filter(Boolean);
    }

    const rolesString = rolesArray.length > 0 ? rolesArray.join(',') : null;

    // Update teacher record
    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        inchargeRole: rolesString,
        inchargeTitle: inchargeTitle || null,
      },
    });

    // Ensure teacher's user account ALWAYS maintains TEACHER portal access
    if (teacher.userId) {
      const userRec = await prisma.user.findUnique({ where: { id: teacher.userId } });
      if (userRec && userRec.role !== 'SUPER_ADMIN' && userRec.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: teacher.userId },
          data: { role: 'TEACHER' },
        });
      }
    }

    // Auto-create standard tasks for ALL selected roles
    let createdTasksCount = 0;
    if (autoCreateTasks && rolesArray.length > 0) {
      const allNewTasks = [];
      for (const r of rolesArray) {
        if (DEFAULT_INCHARGE_TASKS[r]) {
          allNewTasks.push(...DEFAULT_INCHARGE_TASKS[r]);
        }
      }

      if (allNewTasks.length > 0) {
        const created = await prisma.$transaction(
          allNewTasks.map((tpl) =>
            prisma.staffTask.create({
              data: {
                title: tpl.title,
                description: tpl.description,
                category: tpl.category,
                priority: tpl.priority,
                status: 'PENDING',
                assignedToId: teacherId,
                assignedById: req.user.id,
                dueDateBs: dueDateBs || null,
              },
            })
          )
        );
        createdTasksCount = created.length;
      }
    }

    return res.json({
      success: true,
      data: updated,
      roles: rolesArray,
      createdTasksCount,
      message: `Incharge Roles updated successfully! ${createdTasksCount > 0 ? `(${createdTasksCount} duties/tasks auto-assigned)` : ''}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to assign incharge role: ' + err.message });
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

    if (rest.isActive !== undefined && teacher.userId && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { isActive: Boolean(rest.isActive) },
      });
      if (!rest.isActive) {
        await prisma.class.updateMany({
          where: { classTeacherId: teacherId },
          data: { classTeacherId: null },
        });
      }
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

    // Delete staff tasks
    await prisma.staffTask.deleteMany({ where: { assignedToId: teacherId } });

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
