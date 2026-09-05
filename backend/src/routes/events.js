const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const NATIONAL_CALENDAR_DEFAULT_EVENTS = [
  // ─── 01 BAISAKH (बैशाख) ─────────────────────────────────────────────
  { monthDay: '01-01', title: 'Nepali New Year (नयाँ वर्ष)', titleNepali: 'नयाँ वर्ष (मेष संक्रान्ति)', eventType: 'HOLIDAY', isHoliday: true, description: 'National Public Holiday for Nepali New Year' },
  { monthDay: '01-11', title: 'National Democracy Day (लोकतन्त्र दिवस)', titleNepali: 'राष्ट्रिय लोकतन्त्र दिवस', eventType: 'ACADEMIC', isHoliday: false, description: 'National Loktantra Diwas' },
  { monthDay: '01-18', title: 'International Labour Day (मजदुर दिवस)', titleNepali: 'अन्तर्राष्ट्रिय मजदुर दिवस (मे १)', eventType: 'HOLIDAY', isHoliday: true, description: 'International Workers / May Day' },
  { monthDay: '01-25', title: 'Buddha Jayanti & Ubhauli (बुद्ध जयन्ती तथा उभौली)', titleNepali: 'बुद्ध जयन्ती, चण्डी पूर्णिमा तथा उभौली पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Buddha Jayanti and Ubhauli celebration' },

  // ─── 02 JESTHA (जेठ) ────────────────────────────────────────────────
  { monthDay: '02-15', title: 'Republic Day (गणतन्त्र दिवस)', titleNepali: 'राष्ट्रिय गणतन्त्र दिवस', eventType: 'HOLIDAY', isHoliday: true, description: 'National Republic Day' },
  { monthDay: '02-22', title: 'World Environment Day (वातावरण दिवस)', titleNepali: 'विश्व वातावरण दिवस (जुन ५)', eventType: 'ACADEMIC', isHoliday: false, description: 'School Environment Awareness Day' },

  // ─── 03 ASHADH (असार) ───────────────────────────────────────────────
  { monthDay: '03-15', title: 'National Paddy Day (राष्ट्रिय धान दिवस)', titleNepali: 'राष्ट्रिय धान दिवस तथा दही चिउरा खाने दिन', eventType: 'CULTURAL', isHoliday: false, description: 'National Agriculture and Paddy Day' },
  { monthDay: '03-29', title: 'Bhanu Jayanti (भानु जयन्ती)', titleNepali: 'आदिकवि भानुभक्त आचार्य जयन्ती', eventType: 'ACADEMIC', isHoliday: false, description: 'Nepali Literature and Bhanu Jayanti celebration' },
  { monthDay: '03-31', title: 'Guru Purnima (गुरु पूर्णिमा)', titleNepali: 'गुरु पूर्णिमा (व्यास जयन्ती)', eventType: 'ACADEMIC', isHoliday: false, description: 'Honoring teachers and Guru Purnima' },

  // ─── 04 SHRAWAN (साउन) ──────────────────────────────────────────────
  { monthDay: '04-01', title: 'Saune Sankranti (साउने संक्रान्ति)', titleNepali: 'साउने संक्रान्ति (कर्कट संक्रान्ति)', eventType: 'CULTURAL', isHoliday: false, description: 'First day of Shrawan / Saune Sankranti' },
  { monthDay: '04-15', title: 'Kheer Khane Din (खिर खाने दिन)', titleNepali: 'साउन १५ - खिर खाने दिन', eventType: 'CULTURAL', isHoliday: false, description: 'Cultural celebration of Kheer Khane Din' },
  { monthDay: '04-20', title: 'Janai Purnima & Raksha Bandhan (जनै पूर्णिमा)', titleNepali: 'जनै पूर्णिमा तथा रक्षा बन्धन', eventType: 'HOLIDAY', isHoliday: true, description: 'Public Holiday for Janai Purnima and Raksha Bandhan' },
  { monthDay: '04-21', title: 'Gai Jatra (गाईजात्रा)', titleNepali: 'गाईजात्रा पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Cultural Festival of Gai Jatra' },
  { monthDay: '04-28', title: 'Shree Krishna Janmashtami (श्रीकृष्ण जन्माष्टमी)', titleNepali: 'श्रीकृष्ण जन्माष्टमी व्रत तथा पूजा', eventType: 'HOLIDAY', isHoliday: true, description: 'Birth celebration of Lord Krishna' },

  // ─── 05 BHADRA (भदौ) ────────────────────────────────────────────────
  { monthDay: '05-04', title: 'Kushe Aunsi / Father Day (कुशे औंसी)', titleNepali: 'कुशे औंसी (बाबुको मुख हेर्ने दिन)', eventType: 'CULTURAL', isHoliday: false, description: 'Kushe Aunsi and Father Appreciation Day' },
  { monthDay: '05-08', title: 'Gaura Parva (गौरा पर्व)', titleNepali: 'गौरा पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Public Holiday for Gaura Parva' },
  { monthDay: '05-18', title: 'Haritalika Teej (हरितालिका तीज)', titleNepali: 'हरितालिका तीज पर्व (महिला विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Major cultural festival of Teej' },
  { monthDay: '05-20', title: 'Rishi Panchami (ऋषि पञ्चमी)', titleNepali: 'ऋषि पञ्चमी पूजा', eventType: 'CULTURAL', isHoliday: false, description: 'Rishi Panchami celebration' },
  { monthDay: '05-22', title: 'Civil Service Day (निजामती सेवा दिवस)', titleNepali: 'राष्ट्रिय निजामती सेवा दिवस', eventType: 'ACADEMIC', isHoliday: false, description: 'National Civil Service Day' },
  { monthDay: '05-29', title: 'National Children Day (राष्ट्रिय बाल दिवस)', titleNepali: 'राष्ट्रिय बाल दिवस (खेलकुद तथा अतिरिक्त क्रियाकलाप)', eventType: 'ACADEMIC', isHoliday: false, description: 'National Children Day events and ECA' },

  // ─── 06 ASHWIN (असोज) ───────────────────────────────────────────────
  { monthDay: '06-03', title: 'National Constitution Day (संविधान दिवस)', titleNepali: 'राष्ट्रिय संविधान दिवस', eventType: 'HOLIDAY', isHoliday: true, description: 'National Constitution Day Public Holiday' },
  { monthDay: '06-15', title: 'Ghatasthapana (घटस्थापना - बडा दशैं आरम्भ)', titleNepali: 'घटस्थापना (बडा दशैं नवरात्र आरम्भ)', eventType: 'HOLIDAY', isHoliday: true, description: 'Beginning of Dashain Vacation' },
  { monthDay: '06-21', title: 'Fulpati (फूलपाती - दशैं सप्तमी)', titleNepali: 'फूलपाती (दशैं विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Fulpati' },
  { monthDay: '06-22', title: 'Maha Ashtami (महाष्टमी तथा कालरात्रि)', titleNepali: 'महाष्टमी तथा कालरात्रि', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Maha Ashtami' },
  { monthDay: '06-23', title: 'Maha Navami (महानवमी)', titleNepali: 'महानवमी (दशैं विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Maha Navami' },
  { monthDay: '06-24', title: 'Vijaya Dashami (विजया दशमी - बडा दशैं टीका)', titleNepali: 'विजया दशमी (बडा दशैं टीका)', eventType: 'HOLIDAY', isHoliday: true, description: 'Main Day of Dashain Vacation' },
  { monthDay: '06-25', title: 'Dashain Vacation - Ekadashi (एकादशी)', titleNepali: 'पापांकुशा एकादशी (दशैं विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Ekadashi' },
  { monthDay: '06-26', title: 'Dashain Vacation - Dwadashi (द्वादशी)', titleNepali: 'द्वादशी (दशैं विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Dwadashi' },
  { monthDay: '06-27', title: 'Dashain Vacation - Trayodashi (त्रयोदशी)', titleNepali: 'त्रयोदशी (दशैं विदा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Dashain Holiday - Trayodashi' },
  { monthDay: '06-28', title: 'Kojagrat Purnima (कोजाग्रत पूर्णिमा)', titleNepali: 'कोजाग्रत पूर्णिमा (दशैं समापन)', eventType: 'CULTURAL', isHoliday: false, description: 'Conclusion of Dashain Vacation' },

  // ─── 07 KARTIK (कार्तिक) ────────────────────────────────────────────
  { monthDay: '07-12', title: 'Kaag Tihar & Dhanteras (काग तिहार)', titleNepali: 'काग तिहार तथा धनतेरस (यमपञ्चक आरम्भ)', eventType: 'CULTURAL', isHoliday: false, description: 'First day of Tihar' },
  { monthDay: '07-13', title: 'Kukur Tihar (कुकुर तिहार तथा नरक चतुर्दशी)', titleNepali: 'कुकुर तिहार तथा नरक चतुर्दशी', eventType: 'CULTURAL', isHoliday: false, description: 'Tihar Festival' },
  { monthDay: '07-14', title: 'Laxmi Puja & Dipawali (लक्ष्मी पूजा)', titleNepali: 'लक्ष्मी पूजा तथा दिपावली (सुखरात्रि)', eventType: 'HOLIDAY', isHoliday: true, description: 'Festival of Lights - Laxmi Puja' },
  { monthDay: '07-15', title: 'Govardhan Puja & Mha Puja (गोवर्धन पूजा)', titleNepali: 'गोवर्धन पूजा, गाई पूजा तथा म्ह पूजा (नेपाल संवत्)', eventType: 'HOLIDAY', isHoliday: true, description: 'Newari New Year and Govardhan Puja' },
  { monthDay: '07-16', title: 'Bhai Tika (भाइटीका / किजापूजा)', titleNepali: 'भाइटीका तथा किजापूजा (यमद्वितीया)', eventType: 'HOLIDAY', isHoliday: true, description: 'Main Day of Tihar - Bhai Tika' },
  { monthDay: '07-21', title: 'Chhath Parva (छठ पर्व)', titleNepali: 'छठ पर्व (सूर्य षष्ठी पूजा)', eventType: 'HOLIDAY', isHoliday: true, description: 'Major Sun worship festival of Chhath' },

  // ─── 08 MANGSIR (मंसिर) ─────────────────────────────────────────────
  { monthDay: '08-16', title: 'Women Rights Day (महिला अधिकार दिवस)', titleNepali: 'अन्तर्राष्ट्रिय महिला हिंसा विरुद्धको दिवस', eventType: 'ACADEMIC', isHoliday: false, description: 'Women Rights and Safety Awareness' },
  { monthDay: '08-20', title: 'Disabilities Day (अपाङ्गता दिवस)', titleNepali: 'अन्तर्राष्ट्रिय अपाङ्गता दिवस (डिसेम्बर ३)', eventType: 'ACADEMIC', isHoliday: false, description: 'International Day of Persons with Disabilities' },
  { monthDay: '08-29', title: 'Udhauli & Yomari Punhi (उधौली तथा योमरी पुन्ही)', titleNepali: 'उधौली पर्व, योमरी पुन्ही तथा ज्यापू दिवस', eventType: 'HOLIDAY', isHoliday: true, description: 'Kirat & Newar Harvest Festival' },

  // ─── 09 POUSH (पौष) ─────────────────────────────────────────────────
  { monthDay: '09-10', title: 'Christmas Day (क्रिसमस पर्व)', titleNepali: 'क्रिसमस पर्व (डिसेम्बर २५)', eventType: 'HOLIDAY', isHoliday: true, description: 'Public Holiday for Christmas' },
  { monthDay: '09-15', title: 'Tamu Lhosar (तमु ल्होसार)', titleNepali: 'तमु ल्होसार (गुरुङ नयाँ वर्ष)', eventType: 'HOLIDAY', isHoliday: true, description: 'Gurung New Year' },
  { monthDay: '09-27', title: 'National Unity Day (राष्ट्रिय एकता दिवस)', titleNepali: 'राष्ट्रिय एकता दिवस तथा पृथ्वी जयन्ती', eventType: 'HOLIDAY', isHoliday: true, description: 'National Unity Day' },

  // ─── 10 MAGH (माघ) ──────────────────────────────────────────────────
  { monthDay: '10-01', title: 'Maghe Sankranti / Maghi (माघे संक्रान्ति)', titleNepali: 'माघे संक्रान्ति (मकर संक्रान्ति / माघी पर्व)', eventType: 'HOLIDAY', isHoliday: true, description: 'National Festival of Maghi' },
  { monthDay: '10-14', title: 'Sonam Lhosar (सोनाम ल्होसार)', titleNepali: 'सोनाम ल्होसार (तामाङ नयाँ वर्ष)', eventType: 'HOLIDAY', isHoliday: true, description: 'Tamang New Year' },
  { monthDay: '10-16', title: 'Martyrs Day (राष्ट्रिय सहिद दिवस)', titleNepali: 'राष्ट्रिय सहिद दिवस', eventType: 'HOLIDAY', isHoliday: true, description: 'National Martyrs Day' },
  { monthDay: '10-23', title: 'Saraswati Puja (सरस्वती पूजा / श्रीपञ्चमी)', titleNepali: 'सरस्वती पूजा (वसन्त पञ्चमी / श्रीपञ्चमी)', eventType: 'ACADEMIC', isHoliday: true, description: 'School Celebration of Goddess of Knowledge' },

  // ─── 11 FALGUN (फागुन) ───────────────────────────────────────────────
  { monthDay: '11-01', title: 'National Janayuddha Diwas (जनयुद्ध दिवस)', titleNepali: 'राष्ट्रिय जनयुद्ध दिवस', eventType: 'CULTURAL', isHoliday: false, description: 'Janayuddha Diwas' },
  { monthDay: '11-07', title: 'National Democracy Day (प्रजातन्त्र दिवस)', titleNepali: 'राष्ट्रिय प्रजातन्त्र दिवस (फागुन ७)', eventType: 'HOLIDAY', isHoliday: true, description: 'National Democracy Day' },
  { monthDay: '11-14', title: 'Maha Shivaratri (महाशिवरात्रि)', titleNepali: 'महाशिवरात्रि पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Maha Shivaratri Holiday' },
  { monthDay: '11-15', title: 'Gyalbo Lhosar (ग्याल्बो ल्होसार)', titleNepali: 'ग्याल्बो ल्होसार (शेर्पा नयाँ वर्ष)', eventType: 'HOLIDAY', isHoliday: true, description: 'Sherpa New Year' },
  { monthDay: '11-24', title: 'International Women Day (नारी दिवस)', titleNepali: 'अन्तर्राष्ट्रिय महिला दिवस (मार्च ८)', eventType: 'HOLIDAY', isHoliday: true, description: 'International Women Day' },
  { monthDay: '11-29', title: 'Holi / Fagu Purnima (होली पर्व)', titleNepali: 'फागु पूर्णिमा तथा होली पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Festival of Colors - Holi' },

  // ─── 12 CHAITRA (चैत) ───────────────────────────────────────────────
  { monthDay: '12-14', title: 'Ghode Jatra (घोडेजात्रा)', titleNepali: 'घोडेजात्रा पर्व', eventType: 'CULTURAL', isHoliday: false, description: 'Traditional Kathmandu Valley Festival' },
  { monthDay: '12-23', title: 'Chaite Dashain (चैते दशैं)', titleNepali: 'चैते दशैं (चैत्र नवरात्र)', eventType: 'HOLIDAY', isHoliday: true, description: 'Spring Dashain Festival' },
  { monthDay: '12-24', title: 'Ram Navami (राम नवमी)', titleNepali: 'श्री राम नवमी पर्व', eventType: 'HOLIDAY', isHoliday: true, description: 'Ram Navami Celebration' },
  { monthDay: '12-30', title: 'Annual Result & Year End (वार्षिक नतिजा प्रकाशन)', titleNepali: 'वार्षिक नतिजा प्रकाशन तथा शैक्षिक सत्र समापन', eventType: 'ACADEMIC', isHoliday: false, description: 'School Year Closing & Result Declaration' },
];

// Helper: Sync Holiday with Attendance Register
async function syncHolidayWithAttendance(dateBs, holidayName, isHoliday) {
  try {
    if (isHoliday) {
      const classes = await prisma.class.findMany({ select: { id: true } });
      for (const cls of classes) {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { classId: cls.id, isActive: true },
          select: { studentId: true },
        });
        for (const e of enrollments) {
          await prisma.attendance.upsert({
            where: { studentId_dateBs: { studentId: e.studentId, dateBs } },
            update: { status: 'HOLIDAY', remark: holidayName || 'Declared School Holiday' },
            create: {
              studentId: e.studentId,
              classId: cls.id,
              dateBs,
              dateAd: new Date(),
              status: 'HOLIDAY',
              remark: holidayName || 'Declared School Holiday',
            },
          });
        }
      }
    } else {
      await prisma.attendance.deleteMany({
        where: { dateBs, status: 'HOLIDAY' },
      });
    }
  } catch (err) {
    console.error('Error syncing holiday with attendance:', err);
  }
}

// GET /api/events — Fetch events with optional monthBs / dateBs / yearBs filter
router.get('/', authenticate, async (req, res) => {
  try {
    const { monthBs, dateBs, yearBs, targetAudience, limit = 200 } = req.query;
    const where = { isActive: true };

    if (dateBs) {
      where.eventDateBs = dateBs;
    } else if (monthBs) {
      where.eventDateBs = { startsWith: monthBs };
    } else if (yearBs) {
      where.eventDateBs = { startsWith: yearBs };
    }

    if (targetAudience && targetAudience !== 'ALL') {
      where.targetAudience = { in: ['ALL', targetAudience] };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { eventDateBs: 'asc' },
      take: parseInt(limit),
    });

    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/today?dateBs=2083-05-15 — Fetch today's specific events & holidays
router.get('/today', authenticate, async (req, res) => {
  try {
    const { dateBs } = req.query;
    if (!dateBs) {
      return res.status(400).json({ success: false, message: 'dateBs is required.' });
    }

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        eventDateBs: dateBs,
      },
    });

    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events/load-calendar-events — Seed / Load standard National Calendar events for a year
const handleLoadNationalCalendar = async (req, res) => {
  try {
    const { yearBs = '2083' } = req.body;
    let addedCount = 0;

    for (const item of NATIONAL_CALENDAR_DEFAULT_EVENTS) {
      const fullDateBs = `${yearBs}-${item.monthDay}`;
      const existing = await prisma.event.findFirst({
        where: { eventDateBs: fullDateBs, isActive: true },
      });

      if (existing) {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            titleNepali: item.titleNepali,
            description: item.description,
            eventType: item.eventType,
            isHoliday: item.isHoliday,
          },
        });
      } else {
        await prisma.event.create({
          data: {
            title: item.title,
            titleNepali: item.titleNepali,
            description: item.description,
            eventDateBs: fullDateBs,
            eventDateAd: new Date(),
            eventType: item.eventType,
            targetAudience: 'ALL',
            isHoliday: item.isHoliday,
            createdBy: req.user.id,
          },
        });
      }
      addedCount++;

      if (item.isHoliday) {
        await syncHolidayWithAttendance(fullDateBs, item.titleNepali || item.title, true);
      }
    }

    return res.json({
      success: true,
      message: `Successfully synchronized ${addedCount} National Calendar holidays and events for BS ${yearBs}.`,
      addedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/load-calendar-events', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), handleLoadNationalCalendar);
router.post('/load-nepali-patro', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), handleLoadNationalCalendar);

// POST /api/events — Create Event & Sync Holiday with Attendance (Admin Only)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { title, titleNepali, description, eventDateBs, endDateBs, eventType, targetAudience, isHoliday } = req.body;
    if (!title || !eventDateBs) {
      return res.status(400).json({ success: false, message: 'Title and eventDateBs are required.' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        titleNepali,
        description,
        eventDateBs,
        eventDateAd: new Date(),
        endDateBs,
        eventType: eventType || 'ACADEMIC',
        targetAudience: targetAudience || 'ALL',
        isHoliday: Boolean(isHoliday),
        createdBy: req.user.id,
      },
    });

    // If marked as Holiday, automatically update attendance for all classes
    if (isHoliday) {
      await syncHolidayWithAttendance(eventDateBs, title, true);
    }

    return res.status(201).json({ success: true, data: event, message: 'Event / Holiday created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:id — Update Event & Sync Holiday with Attendance (Admin Only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, titleNepali, description, eventDateBs, endDateBs, eventType, targetAudience, isHoliday } = req.body;

    const oldEvent = await prisma.event.findUnique({ where: { id } });

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        titleNepali,
        description,
        eventDateBs,
        endDateBs,
        eventType,
        targetAudience,
        isHoliday: isHoliday !== undefined ? Boolean(isHoliday) : undefined,
      },
    });

    if (isHoliday !== undefined) {
      if (isHoliday) {
        await syncHolidayWithAttendance(event.eventDateBs, event.title, true);
      } else if (oldEvent && oldEvent.isHoliday && !isHoliday) {
        await syncHolidayWithAttendance(oldEvent.eventDateBs, '', false);
      }
    }

    return res.json({ success: true, data: event, message: 'Event / Holiday updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/events/:id — Soft Delete Event & Remove Holiday Attendance (Admin Only)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = await prisma.event.findUnique({ where: { id } });

    await prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    if (event && event.isHoliday) {
      await syncHolidayWithAttendance(event.eventDateBs, '', false);
    }

    return res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events/:id/delete — Proxy-proof POST delete
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = await prisma.event.findUnique({ where: { id } });

    await prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    if (event && event.isHoliday) {
      await syncHolidayWithAttendance(event.eventDateBs, '', false);
    }

    return res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
