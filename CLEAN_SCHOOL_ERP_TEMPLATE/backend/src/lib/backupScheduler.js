const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');

const BACKUP_DIR = path.resolve(__dirname, '../../../BACKUP');

async function generateDatabaseBackup() {
  const timestamp = new Date().toISOString().slice(0, 10);
  const backupFileName = `nepal_school_erp_backup_${timestamp}_${Date.now()}.json`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  console.log(`📦 [AUTO-BACKUP] Generating daily database backup: ${backupFileName}...`);

  try {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      school: await prisma.school.findMany(),
      academicYear: await prisma.academicYear.findMany(),
      user: await prisma.user.findMany(),
      teacher: await prisma.teacher.findMany(),
      student: await prisma.student.findMany(),
      class: await prisma.class.findMany(),
      classEnrollment: await prisma.classEnrollment.findMany(),
      subject: await prisma.subject.findMany(),
      classSubject: await prisma.classSubject.findMany(),
      feeHead: await prisma.feeHead.findMany(),
      feeCollection: await prisma.feeCollection.findMany(),
      incomeCategory: await prisma.incomeCategory.findMany(),
      incomeHead: await prisma.incomeHead.findMany(),
      incomeEntry: await prisma.incomeEntry.findMany(),
      expenseCategory: await prisma.expenseCategory.findMany(),
      expenseHead: await prisma.expenseHead.findMany(),
      expenseEntry: await prisma.expenseEntry.findMany(),
      salaryScale: await prisma.salaryScale.findMany(),
      payroll: await prisma.payroll.findMany(),
      party: await prisma.party.findMany(),
      bankAccount: await prisma.bankAccount.findMany(),
      attendance: await prisma.attendance.findMany(),
      exam: await prisma.exam.findMany(),
      notice: await prisma.notice.findMany(),
      certificate: await prisma.certificate.findMany(),
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ [AUTO-BACKUP] Daily database backup saved successfully: ${backupFilePath}`);

    // Clean up backups older than 30 days
    cleanupOldBackups();
    return { success: true, fileName: backupFileName, path: backupFilePath };

  } catch (err) {
    console.error('❌ [AUTO-BACKUP] Error creating daily database backup:', err.message);
    throw err;
  }
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    files.forEach((file) => {
      if (file.startsWith('nepal_school_erp_backup_') && file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`🧹 [AUTO-BACKUP] Purged backup older than 30 days: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error('⚠️ [AUTO-BACKUP] Error cleaning up old backups:', err.message);
  }
}

function initBackupScheduler() {
  console.log('⏰ [AUTO-BACKUP] Initializing Daily Midnight Backup Scheduler (0 0 * * *)...');
  
  // Run every night at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [AUTO-BACKUP] Midnight cron triggered!');
    await generateDatabaseBackup();
  });

  // Also run an immediate backup on server startup if no backup exists for today
  if (fs.existsSync(BACKUP_DIR)) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingToday = fs.readdirSync(BACKUP_DIR).some(f => f.includes(todayStr));
    if (!existingToday) {
      generateDatabaseBackup().catch(() => {});
    }
  } else {
    generateDatabaseBackup().catch(() => {});
  }
}

module.exports = {
  initBackupScheduler,
  generateDatabaseBackup,
  BACKUP_DIR
};
