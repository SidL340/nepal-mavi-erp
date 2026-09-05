const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const topicsList = [
  { name: 'Teacher Salary & Allowances', nameNepali: 'शिक्षक तलब तथा भत्ता' },
  { name: 'Employees Provident Fund (EPF)', nameNepali: 'कर्मचारी सञ्चय कोष' },
  { name: 'Citizen Investment Trust (CIT)', nameNepali: 'नागरिक लगानी कोष' },
  { name: 'Social Security Fund (SSF)', nameNepali: 'सामाजिक सुरक्षा कोष' },
  { name: 'Mid-Day Meal & Snacks Program', nameNepali: 'दिवा खाजा कार्यक्रम' },
  { name: 'Student Scholarship & Stipends', nameNepali: 'छात्रवृत्ति तथा छात्र प्रोत्साहन' },
  { name: 'Free Textbooks Distribution', nameNepali: 'निःशुल्क पाठ्यपुस्तक' },
  { name: 'Book Corner & Library Resources', nameNepali: 'पुस्तक कुना तथा पुस्तकालय' },
  { name: 'Communication & Postal Services', nameNepali: 'सञ्चार तथा हुलाक सेवा' },
  { name: 'Wi-Fi & Internet Connectivity', nameNepali: 'इन्टरनेट तथा वाईफाई व्यवस्थापन' },
  { name: 'Audit & Financial Verification', nameNepali: 'लेखा परीक्षण तथा लेखापरीक्षक शुल्क' },
  { name: 'Hospitality & Refreshment Expenses', nameNepali: 'अतिथि सत्कार तथा खाजा खर्च' },
  { name: 'Daily Travel & Daily Allowance (TA/DA)', nameNepali: 'दैनिक भ्रमण तथा दैनिक भत्ता' },
  { name: 'Maintenance & Repairs', nameNepali: 'मर्मत सम्भार तथा सम्भार खर्च' },
  { name: 'Physical Construction & Infrastructure', nameNepali: 'भौतिक निर्माण तथा संरचना' },
  { name: 'Electricity Utility Charges', nameNepali: 'विद्युत् महसुल (बिजुली महसुल)' },
  { name: 'Drinking Water & Sanitation Charges', nameNepali: 'खानेपानी तथा सरसफाइ महसुल' },
  { name: 'Bank Charges & Tax Service Fees', nameNepali: 'बैंक कर तथा सेवा शुल्क' },
  { name: 'Annual Functions & School Events', nameNepali: 'वार्षिकोत्सव तथा समारोह खर्च' },
  { name: 'Public Notice & Advertisement', nameNepali: 'विज्ञापन तथा सूचना प्रकाशन' },
  { name: 'Saraswati Puja & Cultural Events', nameNepali: 'सरस्वती पूजा तथा धार्मिक-सांस्कृतिक कार्यक्रम' },
  { name: 'Hygiene & Sanitation Supplies', nameNepali: 'सरसफाइ तथा स्वच्छता सामग्री' },
  { name: 'Prizes, Awards & Recognition', nameNepali: 'पुरस्कार तथा सम्मान' },
  { name: 'Examination Operations & Printing', nameNepali: 'परीक्षा सञ्चालन तथा छपाई' },
  { name: 'Class 8-12 Board & Registration Revenue', nameNepali: 'कक्षा ८ देखि १२ बोर्ड परीक्षा तथा दर्ता राजस्व' },
  { name: 'President Running Shield Sports', nameNepali: 'राष्ट्रपति रनिङ सिल्ड खेलकुद प्रतियोगिता' },
  { name: 'Office & Classroom Stationery Supplies', nameNepali: 'स्टेसनेरी तथा लेखन सामग्री' },
  { name: 'School ERP & Management Software', nameNepali: 'विद्यालय व्यवस्थापन सफ्टवेयर' },
  { name: 'ICT Lab & Digital Equipment', nameNepali: 'सूचना तथा सञ्चार प्रविधि (ICT) ल्याब' },
  { name: 'Contingency & Office Consumables (Masland)', nameNepali: 'मसलन्द तथा कार्यालय उपभोग्य सामग्री' },
  { name: 'Office Administration & Management', nameNepali: 'कार्यालय व्यवस्थापन तथा सञ्चालन खर्च' },
  { name: 'Advance Payment (Peshki)', nameNepali: 'पेश्की भुक्तानी' },
  { name: 'IEMIS Government Portal Management', nameNepali: 'आईइएमआइएस (IEMIS) तथ्याङ्क व्यवस्थापन' },
  { name: 'Student Enrollment & Admission Campaign', nameNepali: 'विद्यार्थी भर्ना अभियान तथा प्रचार-प्रसार' },
  { name: 'Transportation & Logistics Freight', nameNepali: 'ढुवानी तथा ढुवानी खर्च' },
  { name: 'Educational Tour & Field Excursion', nameNepali: 'शैक्षिक भ्रमण तथा अवलोकन अध्ययन' },
];

async function seedTopics() {
  console.log('🌱 Updating 36 standard Nepal school categories & heads...');

  // Seed Categories & Heads for Income & Expense
  for (const item of topicsList) {
    // 1. Income Category
    let incCat = await prisma.incomeCategory.findFirst({ where: { name: item.name } });
    if (!incCat) {
      incCat = await prisma.incomeCategory.create({
        data: {
          name: item.name,
          nameNepali: item.nameNepali,
          type: 'OWN_SOURCE',
        },
      });
    }

    // 2. Income Head
    const existingIncHead = await prisma.incomeHead.findFirst({ where: { name: item.name } });
    if (!existingIncHead) {
      await prisma.incomeHead.create({
        data: {
          categoryId: incCat.id,
          name: item.name,
          nameNepali: item.nameNepali,
        },
      });
    } else {
      await prisma.incomeHead.update({
        where: { id: existingIncHead.id },
        data: { categoryId: incCat.id, nameNepali: item.nameNepali },
      });
    }

    // 3. Expense Category
    let expCat = await prisma.expenseCategory.findFirst({ where: { name: item.name } });
    if (!expCat) {
      expCat = await prisma.expenseCategory.create({
        data: {
          name: item.name,
          nameNepali: item.nameNepali,
        },
      });
    }

    // 4. Expense Head
    const existingExpHead = await prisma.expenseHead.findFirst({ where: { name: item.name } });
    if (!existingExpHead) {
      await prisma.expenseHead.create({
        data: {
          categoryId: expCat.id,
          name: item.name,
          nameNepali: item.nameNepali,
        },
      });
    } else {
      await prisma.expenseHead.update({
        where: { id: existingExpHead.id },
        data: { categoryId: expCat.id, nameNepali: item.nameNepali },
      });
    }
  }

  console.log('✅ Successfully seeded all 36 topics into Income Categories & Expense Categories!');
}

seedTopics()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
