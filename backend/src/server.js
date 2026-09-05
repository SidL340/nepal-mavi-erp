require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── STATIC UPLOADS ─────────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/school',     require('./routes/school'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/teachers',   require('./routes/teachers'));
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/income',     require('./routes/income'));
app.use('/api/expense',    require('./routes/expense'));
app.use('/api/payroll',    require('./routes/payroll'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/exams',      require('./routes/exams'));
app.use('/api/library',    require('./routes/library'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/events',     require('./routes/events'));
app.use('/api/parties',    require('./routes/parties'));
app.use('/api/financial-years', require('./routes/financialYears').router);

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Nepal School ERP API' });
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🏫 Nepal School ERP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const prisma = require('./lib/prisma');
    const bcrypt = require('bcryptjs');

    // Ensure school profile exists
    await prisma.school.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Shree Nepal Secondary School',
        nameNepali: 'श्री नेपाल माध्यमिक विद्यालय',
        address: 'Nepal',
        level: 'Secondary',
        type: 'Community',
      },
    });

    // Deduplicate Academic Years and ensure active 2083-84 (2026 AD) exists
    try {
      const allYears = await prisma.academicYear.findMany({ orderBy: { id: 'asc' } });
      const seen = new Map();
      const toDelete = [];

      for (const yr of allYears) {
        const normalized = (yr.year || '').trim();
        if (!seen.has(normalized)) {
          seen.set(normalized, yr);
        } else {
          const primary = seen.get(normalized);
          const duplicateId = yr.id;
          await prisma.expenseEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.incomeEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.classEnrollment.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.class.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.exam.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.payroll.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          toDelete.push(duplicateId);
        }
      }

      if (toDelete.length > 0) {
        await prisma.academicYear.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`🧹 Cleaned up ${toDelete.length} duplicate academic years.`);
      }

      // Ensure active 2083-84 exists
      let active2083 = await prisma.academicYear.findFirst({ where: { year: { in: ['2083-84', '2083/84', '2083'] } } });
      if (!active2083) {
        active2083 = await prisma.academicYear.create({
          data: {
            year: '2083-84',
            startDateBs: '2083-01-01',
            endDateBs: '2083-12-30',
            isActive: true,
          },
        });
      }

      // Ensure 2083-84 is marked as isActive
      const currentActive = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!currentActive || currentActive.year !== '2083-84') {
        await prisma.academicYear.updateMany({ data: { isActive: false } });
        await prisma.academicYear.update({
          where: { id: active2083.id },
          data: { isActive: true },
        });
      }

      // Ensure standard past fiscal / academic years exist for accounting records
      const standardYears = [
        { year: '2083-84', startDateBs: '2083-01-01', endDateBs: '2083-12-30' },
        { year: '2082-83', startDateBs: '2082-01-01', endDateBs: '2082-12-30' },
        { year: '2081-82', startDateBs: '2081-01-01', endDateBs: '2081-12-30' },
        { year: '2080-81', startDateBs: '2080-01-01', endDateBs: '2080-12-30' },
        { year: '2079-80', startDateBs: '2079-01-01', endDateBs: '2079-12-30' },
      ];

      for (const sy of standardYears) {
        const existing = await prisma.academicYear.findFirst({ where: { year: sy.year } });
        if (!existing) {
          await prisma.academicYear.create({
            data: {
              year: sy.year,
              startDateBs: sy.startDateBs,
              endDateBs: sy.endDateBs,
              isActive: sy.year === '2083-84',
            },
          });
        }
      }

      // ── SEED DEDICATED FINANCIAL YEARS (साउन १ – असार ३१) ─────────────────
      const standardFiscalYears = [
        { year: '2083/84', startDateBs: '2083-04-01', endDateBs: '2084-03-31', isActive: true },
        { year: '2082/83', startDateBs: '2082-04-01', endDateBs: '2083-03-31', isActive: false },
        { year: '2081/82', startDateBs: '2081-04-01', endDateBs: '2082-03-31', isActive: false },
        { year: '2080/81', startDateBs: '2080-04-01', endDateBs: '2081-03-31', isActive: false },
        { year: '2079/80', startDateBs: '2079-04-01', endDateBs: '2080-03-31', isActive: false },
      ];

      for (const sfy of standardFiscalYears) {
        const existingFy = await prisma.financialYear.findFirst({
          where: { year: { in: [sfy.year, sfy.year.replace('/', '-')] } }
        });
        if (!existingFy) {
          await prisma.financialYear.create({
            data: {
              year: sfy.year,
              startDateBs: sfy.startDateBs,
              endDateBs: sfy.endDateBs,
              isActive: sfy.isActive,
            }
          });
        }
      }

      // Ensure 2083/84 is marked active if no active FY
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      if (!activeFy) {
        const fy2083 = await prisma.financialYear.findFirst({ where: { year: { contains: '2083' } } });
        if (fy2083) {
          await prisma.financialYear.update({ where: { id: fy2083.id }, data: { isActive: true } });
        }
      }

      // Auto-backfill financialYearId for existing entries
      const allFiscalYears = await prisma.financialYear.findMany();
      for (const fy of allFiscalYears) {
        await prisma.incomeEntry.updateMany({
          where: {
            financialYearId: null,
            receivedDateBs: { gte: fy.startDateBs, lte: fy.endDateBs }
          },
          data: { financialYearId: fy.id }
        }).catch(() => {});

        await prisma.expenseEntry.updateMany({
          where: {
            financialYearId: null,
            expenseDateBs: { gte: fy.startDateBs, lte: fy.endDateBs }
          },
          data: { financialYearId: fy.id }
        }).catch(() => {});

        await prisma.feeCollection.updateMany({
          where: {
            financialYearId: null,
            paidDateBs: { gte: fy.startDateBs, lte: fy.endDateBs }
          },
          data: { financialYearId: fy.id }
        }).catch(() => {});
      }
    } catch (yrErr) {
      console.error('Academic/Financial year verification error:', yrErr.message);
    }

    // Ensure super admin user exists
    const adminHash = await bcrypt.hash('#Nepal32016', 12);
    await prisma.user.upsert({
      where: { username: 'admin@nepalssb.edu.np' },
      update: { passwordHash: adminHash, isActive: true },
      create: { username: 'admin@nepalssb.edu.np', passwordHash: adminHash, role: 'SUPER_ADMIN' },
    });
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: { passwordHash: adminHash, isActive: true },
      create: { username: 'admin', passwordHash: adminHash, role: 'SUPER_ADMIN' },
    });

    console.log('✅ Auto-seed verified: Super Admin ready (admin@nepalssb.edu.np / #Nepal32016)');

    // Initialize Automatic Daily Backup Scheduler
    const { initBackupScheduler } = require('./lib/backupScheduler');
    initBackupScheduler();
  } catch (err) {
    console.error('⚠️ Auto-seed notice:', err.message);
  }
});

module.exports = app;
