const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'nepal_ssb_erp_secret_key_2081';
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            inchargeRole: true,
            inchargeTitle: true,
            shreni: true,
            post: true,
            type: true,
            isTeachingStaff: true,
            photoUrl: true,
            email: true,
            phone: true,
          },
        },
        student: { select: { id: true, fullName: true, studentId: true, photoUrl: true } },
      },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // SUPER_ADMIN and ADMIN always have full access to all system features
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    // Direct role match on user.role
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Check teacher inchargeRole extra permissions
    const incharge = req.user.teacher?.inchargeRole || '';
    const inchargeList = incharge.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

    const hasInchargePermission = roles.some((role) => {
      const r = role.toUpperCase();
      if ((r === 'ACCOUNTANT' || r === 'ACCOUNT') && (inchargeList.includes('ACCOUNTANT') || inchargeList.includes('ACCOUNT_INCHARGE'))) {
        return true;
      }
      if ((r === 'LIBRARIAN' || r === 'LIBRARY') && (inchargeList.includes('LIBRARIAN') || inchargeList.includes('LIBRARY_INCHARGE'))) {
        return true;
      }
      if ((r === 'EXAM' || r === 'EXAM_INCHARGE') && inchargeList.includes('EXAM_INCHARGE')) {
        return true;
      }
      if (r === 'TEACHER' && req.user.teacher) {
        return true;
      }
      if (inchargeList.includes(r)) {
        return true;
      }
      return false;
    });

    if (hasInchargePermission) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
  };
};

module.exports = { authenticate, authorize };
