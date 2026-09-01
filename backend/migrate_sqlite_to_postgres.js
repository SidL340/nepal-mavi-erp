const { PrismaClient } = require('@prisma/client');
const path = require('path');

const sqliteUrl = 'file:./dev.db';
const postgresUrl = 'postgresql://nepal_mavi_db_user:kaRpJ9iUEbtw6n5kTvCaACfhIDzMo4FD@dpg-dab91h2d0e5s73do56s0-a.singapore-postgres.render.com/nepal_mavi_db?sslmode=require';

// Create SQLite Prisma Client
const sqlitePrisma = new PrismaClient({
  datasources: { db: { url: sqliteUrl } },
});

// Create PostgreSQL Prisma Client
const pgPrisma = new PrismaClient({
  datasources: { db: { url: postgresUrl } },
});

async function migrateData() {
  console.log('📦 Starting full data extraction from local SQLite dev.db (4.18 MB)...');

  try {
    // 1. School
    const schools = await sqlitePrisma.school.findMany();
    console.log(`Found ${schools.length} School records.`);
    for (const s of schools) {
      const { id, ...data } = s;
      await pgPrisma.school.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 2. Academic Years
    const academicYears = await sqlitePrisma.academicYear.findMany();
    console.log(`Found ${academicYears.length} AcademicYear records.`);
    for (const ay of academicYears) {
      const { id, ...data } = ay;
      await pgPrisma.academicYear.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 3. Users
    const users = await sqlitePrisma.user.findMany();
    console.log(`Found ${users.length} User records.`);
    for (const u of users) {
      const { id, ...data } = u;
      await pgPrisma.user.upsert({ where: { username: u.username }, update: data, create: { id, ...data } });
    }

    // 4. Teachers
    const teachers = await sqlitePrisma.teacher.findMany();
    console.log(`Found ${teachers.length} Teacher records.`);
    for (const t of teachers) {
      const { id, ...data } = t;
      await pgPrisma.teacher.upsert({ where: { userId: t.userId }, update: data, create: { id, ...data } });
    }

    // 5. Students
    const students = await sqlitePrisma.student.findMany();
    console.log(`Found ${students.length} Student records.`);
    for (const st of students) {
      const { id, ...data } = st;
      await pgPrisma.student.upsert({ where: { studentId: st.studentId }, update: data, create: { id, ...data } });
    }

    // 6. Classes
    const classes = await sqlitePrisma.class.findMany();
    console.log(`Found ${classes.length} Class records.`);
    for (const c of classes) {
      const { id, ...data } = c;
      await pgPrisma.class.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 7. ClassEnrollments
    const enrollments = await sqlitePrisma.classEnrollment.findMany();
    console.log(`Found ${enrollments.length} ClassEnrollment records.`);
    for (const e of enrollments) {
      const { id, ...data } = e;
      await pgPrisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId: e.studentId, classId: e.classId } },
        update: data,
        create: { id, ...data },
      });
    }

    // 8. Subjects
    const subjects = await sqlitePrisma.subject.findMany();
    console.log(`Found ${subjects.length} Subject records.`);
    for (const sub of subjects) {
      const { id, ...data } = sub;
      await pgPrisma.subject.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 9. ClassSubjects
    const classSubjects = await sqlitePrisma.classSubject.findMany();
    console.log(`Found ${classSubjects.length} ClassSubject records.`);
    for (const cs of classSubjects) {
      const { id, ...data } = cs;
      await pgPrisma.classSubject.upsert({
        where: { classId_subjectId: { classId: cs.classId, subjectId: cs.subjectId } },
        update: data,
        create: { id, ...data },
      });
    }

    // 10. TeacherSubjects
    const teacherSubjects = await sqlitePrisma.teacherSubject.findMany();
    console.log(`Found ${teacherSubjects.length} TeacherSubject records.`);
    for (const ts of teacherSubjects) {
      const { id, ...data } = ts;
      await pgPrisma.teacherSubject.upsert({
        where: { teacherId_subjectId: { teacherId: ts.teacherId, subjectId: ts.subjectId } },
        update: data,
        create: { id, ...data },
      });
    }

    // 11. FeeHeads
    const feeHeads = await sqlitePrisma.feeHead.findMany();
    console.log(`Found ${feeHeads.length} FeeHead records.`);
    for (const fh of feeHeads) {
      const { id, ...data } = fh;
      await pgPrisma.feeHead.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 12. ClassFeeStructures
    const feeStructs = await sqlitePrisma.classFeeStructure.findMany();
    console.log(`Found ${feeStructs.length} ClassFeeStructure records.`);
    for (const fs of feeStructs) {
      const { id, ...data } = fs;
      await pgPrisma.classFeeStructure.upsert({
        where: { classId_feeHeadId: { classId: fs.classId, feeHeadId: fs.feeHeadId } },
        update: data,
        create: { id, ...data },
      });
    }

    // 13. StudentFeeDues
    const feeDues = await sqlitePrisma.studentFeeDue.findMany();
    console.log(`Found ${feeDues.length} StudentFeeDue records.`);
    for (const fd of feeDues) {
      const { id, ...data } = fd;
      await pgPrisma.studentFeeDue.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 14. FeeCollections
    const feeColls = await sqlitePrisma.feeCollection.findMany();
    console.log(`Found ${feeColls.length} FeeCollection records.`);
    for (const fc of feeColls) {
      const { id, ...data } = fc;
      await pgPrisma.feeCollection.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 15. IncomeCategories
    const incCats = await sqlitePrisma.incomeCategory.findMany();
    console.log(`Found ${incCats.length} IncomeCategory records.`);
    for (const ic of incCats) {
      const { id, ...data } = ic;
      await pgPrisma.incomeCategory.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 16. IncomeHeads
    const incHeads = await sqlitePrisma.incomeHead.findMany();
    console.log(`Found ${incHeads.length} IncomeHead records.`);
    for (const ih of incHeads) {
      const { id, ...data } = ih;
      await pgPrisma.incomeHead.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 17. IncomeEntries
    const incEntries = await sqlitePrisma.incomeEntry.findMany();
    console.log(`Found ${incEntries.length} IncomeEntry records.`);
    for (const ie of incEntries) {
      const { id, ...data } = ie;
      await pgPrisma.incomeEntry.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 18. ExpenseCategories
    const expCats = await sqlitePrisma.expenseCategory.findMany();
    console.log(`Found ${expCats.length} ExpenseCategory records.`);
    for (const ec of expCats) {
      const { id, ...data } = ec;
      await pgPrisma.expenseCategory.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 19. ExpenseHeads
    const expHeads = await sqlitePrisma.expenseHead.findMany();
    console.log(`Found ${expHeads.length} ExpenseHead records.`);
    for (const eh of expHeads) {
      const { id, ...data } = eh;
      await pgPrisma.expenseHead.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 20. ExpenseEntries
    const expEntries = await sqlitePrisma.expenseEntry.findMany();
    console.log(`Found ${expEntries.length} ExpenseEntry records.`);
    for (const ee of expEntries) {
      const { id, ...data } = ee;
      await pgPrisma.expenseEntry.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 21. SalaryScales
    const salaryScales = await sqlitePrisma.salaryScale.findMany();
    console.log(`Found ${salaryScales.length} SalaryScale records.`);
    for (const ss of salaryScales) {
      const { id, ...data } = ss;
      await pgPrisma.salaryScale.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 22. Payrolls
    const payrolls = await sqlitePrisma.payroll.findMany();
    console.log(`Found ${payrolls.length} Payroll records.`);
    for (const p of payrolls) {
      const { id, ...data } = p;
      await pgPrisma.payroll.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 23. Attendances
    const attendances = await sqlitePrisma.attendance.findMany();
    console.log(`Found ${attendances.length} Attendance records.`);
    for (const att of attendances) {
      const { id, ...data } = att;
      await pgPrisma.attendance.upsert({
        where: { studentId_dateBs: { studentId: att.studentId, dateBs: att.dateBs } },
        update: data,
        create: { id, ...data },
      });
    }

    // 24. Exams
    const exams = await sqlitePrisma.exam.findMany();
    console.log(`Found ${exams.length} Exam records.`);
    for (const ex of exams) {
      const { id, ...data } = ex;
      await pgPrisma.exam.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 25. ExamClasses
    const examClasses = await sqlitePrisma.examClass.findMany();
    console.log(`Found ${examClasses.length} ExamClass records.`);
    for (const ec of examClasses) {
      const { id, ...data } = ec;
      await pgPrisma.examClass.upsert({
        where: { examId_classId: { examId: ec.examId, classId: ec.classId } },
        update: data,
        create: { id, ...data },
      });
    }

    // 26. ExamSubjects
    const examSubjects = await sqlitePrisma.examSubject.findMany();
    console.log(`Found ${examSubjects.length} ExamSubject records.`);
    for (const es of examSubjects) {
      const { id, ...data } = es;
      const existing = await pgPrisma.examSubject.findFirst({ where: { examId: es.examId, subjectId: es.subjectId } });
      if (!existing) {
        await pgPrisma.examSubject.create({ data: { id, ...data } });
      }
    }

    // 27. MarkTitles
    const markTitles = await sqlitePrisma.markTitle.findMany();
    console.log(`Found ${markTitles.length} MarkTitle records.`);
    for (const mt of markTitles) {
      const { id, ...data } = mt;
      await pgPrisma.markTitle.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 28. MarkEntries
    const markEntries = await sqlitePrisma.markEntry.findMany();
    console.log(`Found ${markEntries.length} MarkEntry records.`);
    for (const me of markEntries) {
      const { id, ...data } = me;
      const existing = await pgPrisma.markEntry.findFirst({
        where: { examSubjectId: me.examSubjectId, markTitleId: me.markTitleId, studentId: me.studentId },
      });
      if (!existing) {
        await pgPrisma.markEntry.create({ data: { id, ...data } });
      }
    }

    // 29. LibraryBooks
    const books = await sqlitePrisma.libraryBook.findMany();
    console.log(`Found ${books.length} LibraryBook records.`);
    for (const b of books) {
      const { id, ...data } = b;
      await pgPrisma.libraryBook.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 30. LibraryIssues
    const issues = await sqlitePrisma.libraryIssue.findMany();
    console.log(`Found ${issues.length} LibraryIssue records.`);
    for (const issue of issues) {
      const { id, ...data } = issue;
      await pgPrisma.libraryIssue.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 31. InventoryCategories
    const invCats = await sqlitePrisma.inventoryCategory.findMany();
    console.log(`Found ${invCats.length} InventoryCategory records.`);
    for (const ic of invCats) {
      const { id, ...data } = ic;
      await pgPrisma.inventoryCategory.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 32. InventoryItems
    const invItems = await sqlitePrisma.inventoryItem.findMany();
    console.log(`Found ${invItems.length} InventoryItem records.`);
    for (const item of invItems) {
      const { id, ...data } = item;
      await pgPrisma.inventoryItem.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 33. Notices
    const notices = await sqlitePrisma.notice.findMany();
    console.log(`Found ${notices.length} Notice records.`);
    for (const n of notices) {
      const { id, ...data } = n;
      await pgPrisma.notice.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    // 34. Certificates
    const certs = await sqlitePrisma.certificate.findMany();
    console.log(`Found ${certs.length} Certificate records.`);
    for (const cert of certs) {
      const { id, ...data } = cert;
      await pgPrisma.certificate.upsert({ where: { certificateNo: cert.certificateNo }, update: data, create: { id, ...data } });
    }

    // 35. Events
    const events = await sqlitePrisma.event.findMany();
    console.log(`Found ${events.length} Event records.`);
    for (const ev of events) {
      const { id, ...data } = ev;
      await pgPrisma.event.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    console.log('\n🎉 ALL LOCAL DATA SUCCESSFULLY MIGRATED AND RESTORED TO POSTGRESQL CLUSTER!');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await sqlitePrisma.$disconnect();
    await pgPrisma.$disconnect();
  }
}

migrateData();
