const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./dev.db' } },
});

async function exportData() {
  console.log('📦 Exporting all local SQLite data to JSON...');
  const data = {};

  const models = [
    'school', 'academicYear', 'user', 'teacher', 'student', 'class',
    'classEnrollment', 'subject', 'classSubject', 'teacherSubject',
    'feeHead', 'classFeeStructure', 'studentFeeDue', 'feeCollection',
    'incomeCategory', 'incomeHead', 'incomeEntry', 'expenseCategory',
    'expenseHead', 'expenseEntry', 'salaryScale', 'payroll',
    'attendance', 'exam', 'examClass', 'examSubject', 'markTitle',
    'markEntry', 'libraryBook', 'libraryIssue', 'inventoryCategory',
    'inventoryItem', 'notice', 'certificate', 'bankAccount', 'event',
    'passwordResetRequest'
  ];

  for (const m of models) {
    try {
      if (prisma[m] && typeof prisma[m].findMany === 'function') {
        const rows = await prisma[m].findMany();
        data[m] = rows;
        if (rows.length > 0) {
          console.log(` - ${m}: ${rows.length} records`);
        }
      }
    } catch (e) {
      console.warn(`Could not export ${m}:`, e.message);
    }
  }

  fs.writeFileSync('./backup_data.json', JSON.stringify(data, null, 2));
  console.log('✅ Export complete! Saved to backup_data.json');
  await prisma.$disconnect();
}

exportData();
