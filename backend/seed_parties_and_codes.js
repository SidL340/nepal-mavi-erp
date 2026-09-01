const prisma = require('./src/lib/prisma');

async function seedPartiesAndCodes() {
  console.log('⚡ Seeding Standard Accounting Codes & Parties/Recipients...');

  // 1. Seed / Update Expense Heads with Codes
  const expenseHeadData = [
    { code: '20101', name: 'कार्यालय सामग्री तथा छपाई (Office Stationery)', nameNepali: 'कार्यालय सामग्री तथा छपाई' },
    { code: '20102', name: 'इन्धन तथा यातायात (Fuel & Travel Expenses)', nameNepali: 'इन्धन तथा यातायात खर्च' },
    { code: '20201', name: 'विद्युत तथा खानेपानी (Electricity & Water Supply)', nameNepali: 'विद्युत तथा खानेपानी महसुल' },
    { code: '20301', name: 'सञ्चार तथा इन्टरनेट खर्च (Internet & Telecom)', nameNepali: 'सञ्चार तथा इन्टरनेट खर्च' },
    { code: '30101', name: 'भवन तथा पूर्वाधार मर्मत (Building Maintenance)', nameNepali: 'भवन तथा पूर्वाधार मर्मत' },
    { code: '30102', name: 'कम्प्युटर तथा ल्याब मर्मत (Lab Equipment Repairs)', nameNepali: 'कम्प्युटर तथा ल्याब मर्मत' },
    { code: '40101', name: 'वार्षिक खेलकुद तथा कार्यक्रम (Sports & Events)', nameNepali: 'वार्षिक खेलकुद तथा सांस्कृतिक कार्यक्रम' },
    { code: '50101', name: 'निजी स्रोत शिक्षक तलब (Private Teacher Salary)', nameNepali: 'निजी स्रोत शिक्षक तलब' },
  ];

  // Get or create expense category
  let defaultCategory = await prisma.expenseCategory.findFirst({ where: { isActive: true } });
  if (!defaultCategory) {
    defaultCategory = await prisma.expenseCategory.create({
      data: { name: 'Administrative & Operational Expenses', nameNepali: 'प्रशासनिक तथा सञ्चालन खर्च' }
    });
  }

  for (const item of expenseHeadData) {
    const existing = await prisma.expenseHead.findFirst({ where: { name: item.name } });
    if (existing) {
      await prisma.expenseHead.update({ where: { id: existing.id }, data: { code: item.code, nameNepali: item.nameNepali } });
    } else {
      await prisma.expenseHead.create({
        data: {
          categoryId: defaultCategory.id,
          name: item.name,
          nameNepali: item.nameNepali,
          code: item.code,
        }
      });
    }
  }

  // 2. Seed / Update Income Heads with Codes
  const incomeHeadData = [
    { code: '10101', name: 'केन्द्रीय सशर्त अनुदान (Central Govt Grant)', nameNepali: 'केन्द्रीय सशर्त अनुदान' },
    { code: '10102', name: 'प्रदेश सरकार बजेट (Provincial Govt Budget)', nameNepali: 'प्रदेश सरकार अनुदान' },
    { code: '10201', name: 'स्थानीय तह बजेट (Local Govt Allocation)', nameNepali: 'स्थानीय तह अनुदान' },
    { code: '10301', name: 'विद्यार्थी शुल्क आम्दानी (Student Fee Income)', nameNepali: 'विद्यार्थी शुल्क आम्दानी' },
    { code: '10401', name: 'आन्तरिक/चन्दा सहयोग (Donations & Misc Revenue)', nameNepali: 'आन्तरिक तथा अन्य आम्दानी' },
  ];

  let defaultIncCat = await prisma.incomeCategory.findFirst({ where: { isActive: true } });
  if (!defaultIncCat) {
    defaultIncCat = await prisma.incomeCategory.create({
      data: { name: 'Government Budget & Own Revenue', nameNepali: 'सरकारी बजेट तथा आन्तरिक आम्दानी' }
    });
  }

  for (const item of incomeHeadData) {
    const existing = await prisma.incomeHead.findFirst({ where: { name: item.name } });
    if (existing) {
      await prisma.incomeHead.update({ where: { id: existing.id }, data: { code: item.code, nameNepali: item.nameNepali } });
    } else {
      await prisma.incomeHead.create({
        data: {
          categoryId: defaultIncCat.id,
          name: item.name,
          nameNepali: item.nameNepali,
          code: item.code,
        }
      });
    }
  }

  // 3. Seed Sample Parties / Recipients
  const partiesData = [
    { name: 'Nepal Electricity Authority (NEA)', nameNepali: 'नेपाल विद्युत प्राधिकरण', partyType: 'GOVT', panNo: '300000001', phone: '01-4152000', address: 'Kathmandu' },
    { name: 'Nepal Telecom (NTC)', nameNepali: 'नेपाल टेलिकम', partyType: 'GOVT', panNo: '300000002', phone: '01-4224000', address: 'Kathmandu' },
    { name: 'Quality Paper & Stationers', nameNepali: 'क्वालिटी स्टेसनरी', partyType: 'VENDOR', panNo: '601234567', phone: '9851012345', address: 'Bishrampur, Rautahat' },
    { name: 'TechSolutions Nepal Suppliers', nameNepali: 'टेक सोलुसन्स नेपाल', partyType: 'SUPPLIER', panNo: '602345678', phone: '9841234567', address: 'Gaur, Rautahat' },
    { name: 'Bishrampur Local Municipality', nameNepali: 'विश्रामपुर गाउँपालिका', partyType: 'GOVT', panNo: '301234567', phone: '055-520111', address: 'Bishrampur' },
  ];

  for (const party of partiesData) {
    const exists = await prisma.party.findFirst({ where: { name: party.name } });
    if (!exists) {
      await prisma.party.create({ data: party });
    }
  }

  // 4. Seed School Bank Accounts
  const bankAccountsData = [
    { accountName: 'School Operational Account (सञ्चालन खाता)', accountNo: '123000987654321', bankName: 'Rastriya Banijya Bank', branch: 'Bishrampur Branch', type: 'Current' },
    { accountName: 'Government Salary & Grant A/C (सरकारी तलब खाता)', accountNo: '567000123456789', bankName: 'Agricultural Development Bank', branch: 'Gaur Branch', type: 'Current' },
    { accountName: 'Internal Reserve & Development A/C (आन्तरिक विकास खाता)', accountNo: '999000888777666', bankName: 'Global IME Bank', branch: 'Bishrampur Branch', type: 'Savings' },
  ];

  for (const acc of bankAccountsData) {
    const exists = await prisma.bankAccount.findFirst({ where: { accountNo: acc.accountNo } });
    if (!exists) {
      await prisma.bankAccount.create({ data: acc });
    }
  }

  console.log('✅ Standard Accounting Codes, Parties/Recipients, and Bank Accounts successfully seeded!');
}

seedPartiesAndCodes()
  .catch((e) => console.error('Error seeding parties & codes:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
