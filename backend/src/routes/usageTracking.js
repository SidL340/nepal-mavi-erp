const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to get fallback BS date string
function getTodayBs() {
  const now = new Date();
  return `2083-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ── 1. GET USAGE TRACKING & ACTIVE USER SUMMARY ─────────────────────────────
// GET /api/usage-tracking/summary
router.get('/summary', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const today = req.query.dateBs || getTodayBs();
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalLoginsToday,
      distinctUsersToday,
      activeUsersOnline,
      totalRegisteredUsers,
      loginsByRoleRaw,
      devicesRaw,
      recentLogins,
      onlineUsersList,
    ] = await Promise.all([
      // Total login events today
      prisma.userLoginLog.count({
        where: {
          OR: [{ loginDateBs: today }, { loginAt: { gte: startOfToday } }],
        },
      }),

      // Distinct users who logged in today
      prisma.userLoginLog.groupBy({
        by: ['userId'],
        where: {
          OR: [{ loginDateBs: today }, { loginAt: { gte: startOfToday } }],
        },
      }),

      // Users currently active / online (active in last 15 mins)
      prisma.user.count({
        where: {
          isActive: true,
          lastActiveAt: { gte: fifteenMinsAgo },
        },
      }),

      // Total registered user accounts
      prisma.user.count(),

      // Logins by role today
      prisma.userLoginLog.groupBy({
        by: ['role'],
        _count: { id: true },
        where: {
          OR: [{ loginDateBs: today }, { loginAt: { gte: startOfToday } }],
        },
      }),

      // Device breakdown today
      prisma.userLoginLog.groupBy({
        by: ['deviceType'],
        _count: { id: true },
        where: {
          OR: [{ loginDateBs: today }, { loginAt: { gte: startOfToday } }],
        },
      }),

      // 10 most recent logins
      prisma.userLoginLog.findMany({
        take: 12,
        orderBy: { loginAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              teacher: { select: { fullName: true, post: true, photoUrl: true } },
              student: { select: { fullName: true, studentId: true, photoUrl: true } },
            },
          },
        },
      }),

      // Online users list
      prisma.user.findMany({
        where: {
          isActive: true,
          lastActiveAt: { gte: fifteenMinsAgo },
        },
        select: {
          id: true,
          username: true,
          role: true,
          lastActiveAt: true,
          lastLoginAt: true,
          teacher: { select: { fullName: true, post: true, photoUrl: true } },
          student: {
            select: {
              fullName: true,
              studentId: true,
              photoUrl: true,
              classEnrollment: {
                where: { isActive: true },
                select: { class: { select: { name: true, section: true } } },
              },
            },
          },
        },
        take: 30,
        orderBy: { lastActiveAt: 'desc' },
      }),
    ]);

    // Format role counts
    const roleStats = {
      TEACHER: 0,
      STUDENT: 0,
      ADMIN: 0,
      LIBRARIAN: 0,
      ACCOUNTANT: 0,
    };
    loginsByRoleRaw.forEach((r) => {
      const roleKey = (r.role || '').toUpperCase();
      if (roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN') roleStats.ADMIN += r._count.id;
      else if (roleStats[roleKey] !== undefined) roleStats[roleKey] += r._count.id;
      else roleStats[roleKey] = r._count.id;
    });

    // Format device counts
    const deviceStats = { Desktop: 0, Mobile: 0, Tablet: 0 };
    devicesRaw.forEach((d) => {
      const key = d.deviceType || 'Desktop';
      deviceStats[key] = (deviceStats[key] || 0) + d._count.id;
    });

    // Calculate 7-day activity history
    const sevenDaysTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const [countForDay, distinctForDay] = await Promise.all([
        prisma.userLoginLog.count({
          where: { loginAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.userLoginLog.groupBy({
          by: ['userId'],
          where: { loginAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      sevenDaysTrend.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: dayStr,
        totalLogins: countForDay,
        distinctUsers: distinctForDay.length,
      });
    }

    return res.json({
      success: true,
      data: {
        todayBs: today,
        totalLoginsToday,
        distinctUsersTodayCount: distinctUsersToday.length,
        activeUsersOnlineCount: activeUsersOnline,
        totalRegisteredUsers,
        roleStats,
        deviceStats,
        sevenDaysTrend,
        recentLogins,
        onlineUsersList,
      },
    });
  } catch (err) {
    console.error('Error fetching usage summary:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET LOGIN AUDIT LOGS (PAGINATED & FILTERED) ───────────────────────────
// GET /api/usage-tracking/logs?q=&role=&dateBs=&page=&limit=
router.get('/logs', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { q, role, dateBs, page = 1, limit = 40 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (role && role !== 'ALL') {
      if (role === 'ADMIN') where.role = { in: ['SUPER_ADMIN', 'ADMIN'] };
      else where.role = role;
    }
    if (dateBs && dateBs.trim()) where.loginDateBs = dateBs.trim();
    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { ipAddress: { contains: search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.userLoginLog.count({ where }),
      prisma.userLoginLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              teacher: { select: { fullName: true, post: true, photoUrl: true } },
              student: {
                select: {
                  fullName: true,
                  studentId: true,
                  photoUrl: true,
                  classEnrollment: {
                    where: { isActive: true },
                    select: { rollNo: true, class: { select: { name: true, section: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { loginAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('Error fetching login audit logs:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. HEARTBEAT / PING (CALLED BY ACTIVE USERS) ────────────────────────────
// POST /api/usage-tracking/ping
router.post('/ping', authenticate, async (req, res) => {
  try {
    const now = new Date();
    await prisma.user.update({
      where: { id: req.user.id },
      data: { lastActiveAt: now },
    });
    return res.json({ success: true, timestamp: now });
  } catch (err) {
    return res.json({ success: false });
  }
});

module.exports = router;
