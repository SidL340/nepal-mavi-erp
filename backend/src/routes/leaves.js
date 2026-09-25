const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/leaves/apply — Apply for leave (Teacher or Student)
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { startDateBs, endDateBs, totalDays, reason } = req.body;

    if (!startDateBs || !endDateBs || !reason) {
      return res.status(400).json({ success: false, message: 'सुरु मिति, अन्तिम मिति र बिदाको कारण (Reason) अनिवार्य छ।' });
    }

    let applicantType = 'STUDENT';
    let teacherId = null;
    let studentId = null;
    let classId = null;

    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
      });
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'शिक्षक प्रोफाइल फेला परेन।' });
      }
      applicantType = 'TEACHER';
      teacherId = teacher.id;
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          classEnrollment: {
            where: { isActive: true },
            include: { class: true },
            take: 1,
          },
        },
      });
      if (!student) {
        return res.status(404).json({ success: false, message: 'विद्यार्थी प्रोफाइल फेला परेन।' });
      }
      applicantType = 'STUDENT';
      studentId = student.id;
      classId = student.classEnrollment[0]?.classId || null;
    } else {
      return res.status(403).json({ success: false, message: 'बिदा आवेदन केवल शिक्षक र विद्यार्थीले मात्र दिन सक्नुहुन्छ।' });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        applicantType,
        teacherId,
        studentId,
        classId,
        startDateBs: String(startDateBs).trim(),
        endDateBs: String(endDateBs).trim(),
        totalDays: parseInt(totalDays) || 1,
        reason: String(reason).trim(),
        status: 'PENDING',
      },
    });

    return res.json({
      success: true,
      message: 'बिदाको निवेदन सफलतापूर्वक दर्ता भयो!',
      data: leave,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/leaves/my — Get my submitted leave applications
router.get('/my', authenticate, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.json({ success: true, data: [] });
      where = { teacherId: teacher.id, applicantType: 'TEACHER' };
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.json({ success: true, data: [] });
      where = { studentId: student.id, applicantType: 'STUDENT' };
    } else {
      return res.json({ success: true, data: [] });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        class: true,
      },
    });

    return res.json({ success: true, data: leaves });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/leaves/class-pending — Get pending student leaves for the logged-in Class Teacher
router.get('/class-pending', authenticate, authorize('TEACHER'), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      include: { classTeacherOf: true },
    });

    if (!teacher || !teacher.classTeacherOf || teacher.classTeacherOf.length === 0) {
      return res.json({ success: true, data: [], myClasses: [] });
    }

    const classIds = teacher.classTeacherOf.map(c => c.id);

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        applicantType: 'STUDENT',
        classId: { in: classIds },
      },
      include: {
        student: {
          include: {
            classEnrollment: {
              where: { isActive: true },
              include: { class: true },
              take: 1,
            },
          },
        },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: leaves,
      myClasses: teacher.classTeacherOf,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/leaves — Admin view all leave requests with filters
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { applicantType, status, classId } = req.query;
    const where = {};
    if (applicantType) where.applicantType = applicantType;
    if (status) where.status = status;
    if (classId) where.classId = parseInt(classId);

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        teacher: true,
        student: {
          include: {
            classEnrollment: {
              where: { isActive: true },
              include: { class: true },
              take: 1,
            },
          },
        },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: leaves });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/leaves/:id/review — Approve or Reject a leave application
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id);
    const { status, remarks } = req.body; // status: "APPROVED" | "REJECTED"

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'मान्य स्थिति (APPROVED वा REJECTED) छनोट गर्नुहोस्।' });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        class: true,
        teacher: true,
        student: true,
      },
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'बिदा आवेदन फेला परेन।' });
    }

    let reviewerName = req.user.username;
    let reviewerRole = req.user.role;

    // Strict Permission Validation:
    // 1. If Teacher leave: ONLY Admin / Super Admin can approve.
    if (leave.applicantType === 'TEACHER') {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'शिक्षकको बिदा केवल प्रधानाध्यापक / प्रशासन (Admin) ले मात्र स्वीकृत वा अस्वीकृत गर्न सक्नुहुन्छ।',
        });
      }
      reviewerRole = 'ADMIN';
      reviewerName = 'प्रशासन (Admin)';
    }

    // 2. If Student leave: ONLY the designated Class Teacher of this student's class OR Admin can approve.
    if (leave.applicantType === 'STUDENT') {
      if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        reviewerRole = 'ADMIN';
        reviewerName = 'प्रशासन (Admin)';
      } else if (req.user.role === 'TEACHER') {
        const currentTeacher = await prisma.teacher.findUnique({
          where: { userId: req.user.id },
        });
        if (!currentTeacher) {
          return res.status(403).json({ success: false, message: 'शिक्षक विवरण फेला परेन।' });
        }
        // Verify this teacher is strictly the Class Teacher of this student's class
        if (!leave.classId || leave.class?.classTeacherId !== currentTeacher.id) {
          return res.status(403).json({
            success: false,
            message: 'विद्यार्थीको बिदा स्वीकृत गर्ने अधिकार सम्बन्धित कक्षा शिक्षक (Class Teacher) लाई मात्र छ।',
          });
        }
        reviewerRole = 'CLASS_TEACHER';
        reviewerName = `कक्षा शिक्षक: ${currentTeacher.fullName}`;
      } else {
        return res.status(403).json({ success: false, message: 'तपाईंसँग बिदा स्वीकृत गर्ने अधिकार छैन।' });
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedByRole: reviewerRole,
        reviewedByName: reviewerName,
        reviewedById: req.user.id,
        reviewRemarks: remarks ? String(remarks).trim() : null,
        reviewedAt: new Date(),
      },
    });

    const actionText = status === 'APPROVED' ? 'स्वीकृत (Approved)' : 'अस्वीकृत (Rejected)';
    return res.json({
      success: true,
      message: `बिदा आवेदन ${actionText} गरियो।`,
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/leaves/:id — Edit / Modify pending leave application
router.put('/:id', authenticate, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id);
    const { startDateBs, endDateBs, totalDays, reason } = req.body;

    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) return res.status(404).json({ success: false, message: 'आवेदन फेला परेन।' });

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'स्वीकृत वा अस्वीकृत भइसकेको आवेदन सम्पादन गर्न मिल्दैन।' });
    }

    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || leave.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'अधिकार छैन।' });
      }
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student || leave.studentId !== student.id) {
        return res.status(403).json({ success: false, message: 'अधिकार छैन।' });
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        startDateBs: startDateBs ? String(startDateBs).trim() : leave.startDateBs,
        endDateBs: endDateBs ? String(endDateBs).trim() : leave.endDateBs,
        totalDays: totalDays ? parseInt(totalDays) : leave.totalDays,
        reason: reason ? String(reason).trim() : leave.reason,
      },
    });

    return res.json({
      success: true,
      message: 'बिदा आवेदन सफलतापूर्वक परिमार्जन गरियो!',
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/leaves/:id — Delete / Cancel leave request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id);
    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) return res.status(404).json({ success: false, message: 'आवेदन फेला परेन।' });

    // Allow author to delete if still PENDING, or admin/accountant anytime
    if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(req.user.role)) {
      await prisma.leaveRequest.delete({ where: { id: leaveId } });
      return res.json({ success: true, message: 'बिदा आवेदन हटाइयो (Leave application deleted).' });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'कारबाही भइसकेको बिदा आवेदन मेटाउन मिल्दैन।' });
    }

    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || leave.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'अधिकार छैन।' });
      }
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student || leave.studentId !== student.id) {
        return res.status(403).json({ success: false, message: 'अधिकार छैन।' });
      }
    }

    await prisma.leaveRequest.delete({ where: { id: leaveId } });
    return res.json({ success: true, message: 'तपाईंको बिदा आवेदन रद्द गरियो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
