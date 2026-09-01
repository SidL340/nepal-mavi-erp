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
        name: 'Nepal SSB Secondary School',
        nameNepali: 'नेपाल एसएसबी माध्यमिक विद्यालय',
        address: 'Nepal',
        level: 'Secondary',
        type: 'Community',
      },
    });

    // Ensure active academic year exists
    await prisma.academicYear.upsert({
      where: { id: 1 },
      update: {},
      create: { year: '2081-82', startDateBs: '2081-04-01', endDateBs: '2082-03-31', isActive: true },
    });

    // Ensure super admin user exists
    const adminHash = await bcrypt.hash('Admin@2081', 12);
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: { passwordHash: adminHash, isActive: true },
      create: { username: 'admin', passwordHash: adminHash, role: 'SUPER_ADMIN' },
    });

    console.log('✅ Auto-seed verified: Super Admin user ready (admin / Admin@2081)');
  } catch (err) {
    console.error('⚠️ Auto-seed notice:', err.message);
  }
});

module.exports = app;
