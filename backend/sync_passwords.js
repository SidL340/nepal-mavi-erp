const prisma = require('./src/lib/prisma');
const bcrypt = require('bcryptjs');

async function syncAllStudentPasswords() {
  console.log('Starting student password sync...');
  const studentUsers = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      student: {
        include: {
          classEnrollment: { where: { isActive: true } }
        }
      }
    }
  });

  console.log(`Found ${studentUsers.length} student users.`);

  let updatedCount = 0;
  for (const u of studentUsers) {
    const rollNo = u.student?.classEnrollment?.[0]?.rollNo || u.id;
    const rawPassword = `SSB@${rollNo}`;
    const passwordHash = await bcrypt.hash(rawPassword, 6);

    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      }
    });

    updatedCount++;
    if (updatedCount % 100 === 0) {
      console.log(`Synced ${updatedCount}/${studentUsers.length} student passwords...`);
    }
  }

  console.log(`SUCCESS: Synced all ${updatedCount} student passwords to SSB@rollNo format!`);
}

syncAllStudentPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
