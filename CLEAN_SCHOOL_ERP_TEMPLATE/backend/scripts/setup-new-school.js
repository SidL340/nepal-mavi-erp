const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupNewSchool() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.edu.np';
  const adminPassword = process.env.ADMIN_PASSWORD || '#SchoolAdmin2081';

  console.log('🚀 Initializing fresh school setup...');

  // 1. Create or ensure Super Admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: adminEmail },
    update: { password: hashedPassword, role: 'SUPER_ADMIN', isActive: true },
    create: {
      username: adminEmail,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', adminEmail);

  // 2. Create initial blank School Profile
  const existingSchool = await prisma.school.findFirst();
  if (!existingSchool) {
    await prisma.school.create({
      data: {
        name: '',
        nameNepali: '',
        address: '',
        district: '',
        province: '',
        emisCode: '',
        phone: '',
        email: adminEmail,
        website: '',
        principalName: '',
        level: 'Secondary (माध्यमिक)',
        type: 'Community (सामुदायिक)',
      },
    });
    console.log('✅ Blank School Profile initialized.');
  }

  // 3. Create current Academic Year
  const existingYear = await prisma.academicYear.findFirst();
  if (!existingYear) {
    await prisma.academicYear.create({
      data: {
        year: '2081-82',
        startDateBs: '2081-04-01',
        endDateBs: '2082-03-31',
        isActive: true,
      },
    });
    console.log('✅ Academic Year 2081-82 created and set to ACTIVE.');
  }

  console.log('🎉 Setup complete! You can now log in with:');
  console.log('👉 Username:', adminEmail);
  console.log('👉 Password:', adminPassword);
  process.exit(0);
}

setupNewSchool().catch(err => {
  console.error('❌ Setup error:', err);
  process.exit(1);
});
