const prisma = require('./src/lib/prisma');

async function seedCompleteData() {
  console.log('🚀 Seeding Attendance, Fees & Certificates...');

  // 1. Get Students
  const students = await prisma.student.findMany({
    where: { isActive: true },
    include: { classEnrollment: true },
  });

  console.log(`Found ${students.length} students to populate records for.`);

  // 2. Populate Attendance Records for Past 30 Days (BS 2083)
  console.log('📅 Generating Attendance records for students...');
  const sampleDates = [
    { bs: '2083-01-02', ad: new Date('2026-04-15') },
    { bs: '2083-01-03', ad: new Date('2026-04-16') },
    { bs: '2083-01-04', ad: new Date('2026-04-17') },
    { bs: '2083-01-05', ad: new Date('2026-04-18') },
    { bs: '2083-01-06', ad: new Date('2026-04-19') },
    { bs: '2083-01-09', ad: new Date('2026-04-22') },
    { bs: '2083-01-10', ad: new Date('2026-04-23') },
    { bs: '2083-01-11', ad: new Date('2026-04-24') },
    { bs: '2083-01-12', ad: new Date('2026-04-25') },
    { bs: '2083-01-13', ad: new Date('2026-04-26') },
    { bs: '2083-01-16', ad: new Date('2026-04-29') },
    { bs: '2083-01-17', ad: new Date('2026-04-30') },
    { bs: '2083-01-18', ad: new Date('2026-05-01') },
    { bs: '2083-01-19', ad: new Date('2026-05-02') },
    { bs: '2083-01-20', ad: new Date('2026-05-03') },
    { bs: '2083-01-23', ad: new Date('2026-05-06') },
    { bs: '2083-01-24', ad: new Date('2026-05-07') },
    { bs: '2083-01-25', ad: new Date('2026-05-08') },
    { bs: '2083-01-26', ad: new Date('2026-05-09') },
    { bs: '2083-01-27', ad: new Date('2026-05-10') },
    { bs: '2083-02-01', ad: new Date('2026-05-15') },
    { bs: '2083-02-02', ad: new Date('2026-05-16') },
    { bs: '2083-02-03', ad: new Date('2026-05-17') },
    { bs: '2083-02-04', ad: new Date('2026-05-18') },
    { bs: '2083-02-05', ad: new Date('2026-05-19') },
    { bs: '2083-02-08', ad: new Date('2026-05-22') },
    { bs: '2083-02-09', ad: new Date('2026-05-23') },
    { bs: '2083-02-10', ad: new Date('2026-05-24') },
    { bs: '2083-02-11', ad: new Date('2026-05-25') },
    { bs: '2083-02-12', ad: new Date('2026-05-26') },
  ];

  let attCreated = 0;
  for (const student of students.slice(0, 50)) { // Active students
    const classId = student.classEnrollment?.[0]?.classId || 1;

    for (const d of sampleDates) {
      const exists = await prisma.attendance.findFirst({
        where: { studentId: student.id, dateBs: d.bs },
      });

      if (!exists) {
        const rand = Math.random();
        let status = 'PRESENT';
        let remark = 'Regular Class';
        if (rand > 0.96) {
          status = 'ABSENT';
          remark = 'Sick leave / Uninformed';
        } else if (rand > 0.93) {
          status = 'LEAVE';
          remark = 'Approved medical leave';
        }

        await prisma.attendance.create({
          data: {
            studentId: student.id,
            classId,
            dateBs: d.bs,
            dateAd: d.ad,
            status,
            remark,
          },
        });
        attCreated++;
      }
    }
  }
  console.log(`✓ Inserted ${attCreated} attendance records.`);

  // 3. Ensure Fee Heads & Fee Collections
  console.log('💰 Generating Fee Heads & Collections...');
  const feeHeadNames = [
    { name: 'Monthly Tuition Fee (मासिक शुल्क)', amount: 1500 },
    { name: 'Terminal Examination Fee (परीक्षा शुल्क)', amount: 500 },
    { name: 'Computer Lab & Practical Fee (कम्प्युटर ल्याब)', amount: 800 },
    { name: 'Library & Sports Fee (पुस्तकालय तथा खेलकुद)', amount: 400 },
  ];

  const feeHeads = [];
  for (const fh of feeHeadNames) {
    let head = await prisma.feeHead.findFirst({ where: { name: fh.name } });
    if (!head) {
      head = await prisma.feeHead.create({
        data: { name: fh.name, amount: fh.amount, isActive: true },
      });
    }
    feeHeads.push(head);
  }

  let feeCreated = 0;
  for (const student of students.slice(0, 30)) {
    for (let i = 0; i < feeHeads.length; i++) {
      const fh = feeHeads[i];
      const count = await prisma.feeCollection.count();
      const receiptNo = `RCP-2083-${String(count + 1).padStart(5, '0')}`;

      const exists = await prisma.feeCollection.findFirst({
        where: { studentId: student.id, feeHeadId: fh.id },
      });

      if (!exists) {
        await prisma.feeCollection.create({
          data: {
            studentId: student.id,
            feeHeadId: fh.id,
            amount: fh.amount,
            receiptNo,
            paidDateBs: '2083-02-15',
            paidDateAd: new Date('2026-05-28'),
            collectedBy: 'Account Section',
            remarks: 'Full payment received',
          },
        });
        feeCreated++;
      }
    }
  }
  console.log(`✓ Inserted ${feeCreated} fee collections.`);

  // 4. Generate Certificates
  console.log('📜 Generating Sample Certificates...');
  for (const student of students.slice(0, 10)) {
    const certExists = await prisma.certificate.findFirst({
      where: { studentId: student.id },
    });

    if (!certExists) {
      const count = await prisma.certificate.count();
      await prisma.certificate.create({
        data: {
          studentId: student.id,
          type: 'CHARACTER',
          certificateNo: `CC-2083-${String(count + 1).padStart(4, '0')}`,
          issuedDateBs: '2083-03-28',
          issuedBy: 'Head Teacher / Principal',
          remarks: 'Good character and moral conduct.',
          data: JSON.stringify({
            conduct: 'Good',
            academicPerformance: 'Excellent',
            extraCurricular: 'Football & Quiz Contest',
          }),
        },
      });
    }
  }

  // 5. Ensure Library Books & Issues
  console.log('📚 Populating Library Books...');
  const sampleBooks = [
    { title: 'Secondary School Science & Environment 10', author: 'Janak Education Material', category: 'Science', copies: 25 },
    { title: 'Our Social Studies and Human Values 10', author: 'CDC Sanothimi', category: 'Social Studies', copies: 30 },
    { title: 'Advanced Compulsory Mathematics', author: 'Prof. B. R. Sharma', category: 'Mathematics', copies: 20 },
    { title: 'Nepali Brihat Shabdakosh (नेपाली बृहत् शब्दकोश)', author: 'Nepal Academy', category: 'Language & Reference', copies: 5 },
    { title: 'The Story of My Experiments with Truth', author: 'M. K. Gandhi', category: 'Biography', copies: 8 },
    { title: 'Computer Science & Python for Secondary Level', author: 'S. K. Adhikari', category: 'Computer', copies: 15 },
  ];

  for (const b of sampleBooks) {
    let book = await prisma.book.findFirst({ where: { title: b.title } });
    if (!book) {
      book = await prisma.book.create({
        data: {
          title: b.title,
          author: b.author,
          category: b.category,
          totalCopies: b.copies,
          availableCopies: b.copies - 1,
          shelfLocation: 'Section B-4',
        },
      });

      // Issue to Student 1
      if (students[0]) {
        await prisma.libraryIssue.create({
          data: {
            bookId: book.id,
            studentId: students[0].id,
            issuedDateBs: '2083-02-10',
            issuedDateAd: new Date('2026-05-23'),
            dueDateBs: '2083-02-25',
            dueDateAd: new Date('2026-06-07'),
            isReturned: false,
            remarks: 'Issued for classroom reading',
          },
        });
      }
    }
  }

  console.log('🎉 Full School Records Populated Successfully!');
}

seedCompleteData()
  .catch(err => {
    console.error('Error seeding data:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
