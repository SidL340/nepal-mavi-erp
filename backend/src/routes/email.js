const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Seed sample school emails if table is empty
async function seedDefaultEmailsIfEmpty() {
  const count = await prisma.schoolEmail.count();
  if (count === 0) {
    await prisma.schoolEmail.createMany({
      data: [
        {
          folder: 'INBOX',
          fromAddress: 'info@doe.gov.np',
          fromName: 'शिक्षा तथा मानव स्रोत विकास केन्द्र (CEHRD / DoE)',
          toAddress: 'nepalsecondaryschool.bdn@gmail.com',
          toName: 'श्री नेपाल मा.वि. विश्रामपुर',
          subject: 'शैक्षिक सत्र २०८३/८४ को वार्षिक कार्यतालिका तथा छात्रवृत्ति कोटा विवरण सम्बन्धमा',
          body: `श्री प्रधानाध्यापक ज्यू,
श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, वृन्दावन-२, रौतहट।

विषय: शैक्षिक सत्र २०८३/८४ को वार्षिक कार्यतालिका र छात्रवृत्ति कोटा वितरण सम्बन्धमा।

उपर्युक्त विषयमा शिक्षा तथा मानव स्रोत विकास केन्द्रबाट स्वीकृत चालु शैक्षिक सत्रको वार्षिक कार्यतालिका अनुसार विद्यालयमा सञ्चालन गरिने विभिन्न शैक्षिक तथा अतिरिक्त क्रियाकलापहरू समयमै सम्पन्न गर्न हुन अनुरोध छ। साथै विपन्न, दलित तथा जेहेन्दार विद्यार्थीहरूका लागि तोकिएको छात्रवृत्ति कोटा विवरण यसैसाथ संलग्न गरिएको छ।

भवदीय,
शिक्षा शाखा अधिकृत
शिक्षा तथा मानव स्रोत विकास केन्द्र, सानोठिमी, भक्तपुर`,
          isRead: false,
          isStarred: true,
          receivedOrSentAt: new Date(),
        },
        {
          folder: 'INBOX',
          fromAddress: 'education@brindawanmun.gov.np',
          fromName: 'वृन्दावन नगरपालिका - शिक्षा, युवा तथा खेलकुद शाखा',
          toAddress: 'nepalsecondaryschool.bdn@gmail.com',
          toName: 'श्री नेपाल माध्यमिक विद्यालय',
          subject: 'मासिक शिक्षक हाजिरी प्रतिवेदन तथा दिवा खाजा कार्यक्रमको निकासा सम्बन्धमा',
          body: `श्री प्रधानाध्यापक ज्यू,
श्री नेपाल मा.वि., विश्रामपुर, रौतहट।

विषय: मासिक प्रगति तथा दिवा खाजा निकासा सम्बन्धी।

चालु महिनाको दिवा खाजा कार्यक्रम अन्तर्गतको विद्यार्थी उपस्थिति तथा शिक्षक कर्मचारीहरूको मासिक हाजिरी विवरण तत्काल नगरपालिकाको शिक्षा शाखामा पेश गरी निकासा प्रक्रिया अगाडि बढाउनुहुन सूचित गरिन्छ।

शिक्षा शाखा प्रमुख
वृन्दावन नगरपालिका, रौतहट`,
          isRead: true,
          isStarred: false,
          receivedOrSentAt: new Date(Date.now() - 86400000 * 2),
        },
        {
          folder: 'SENT',
          fromAddress: 'nepalsecondaryschool.bdn@gmail.com',
          fromName: 'श्री नेपाल मा.वि. विश्रामपुर, रौतहट',
          toAddress: 'education@brindawanmun.gov.np',
          toName: 'वृन्दावन नगरपालिका शिक्षा शाखा',
          subject: 'शैक्षिक सत्र २०८३ को विद्यार्थी भर्ना तथा कक्षागत तथ्याङ्क प्रतिवेदन',
          body: `श्री शिक्षा अधिकृत ज्यू,
वृन्दावन नगरपालिका, रौतहट।

विषय: नयाँ भर्ना तथ्याङ्क सम्बन्धमा।

यस श्री नेपाल माध्यमिक विद्यालय विश्रामपुरमा चालु शैक्षिक सत्र २०८३ मा भर्ना भएका सम्पूर्ण कक्षा १ देखि १२ सम्मका छात्रछात्राहरूको एकीकृत तथ्याङ्क तथा EMIS प्रतिवेदन जानकारी तथा आवश्यक कार्यार्थ प्रेषित गरिएको छ।

भवदीय,
प्रेमलाल प्रसाद राउत
प्रधानाध्यापक
श्री नेपाल मा.वि., विश्रामपुर, रौतहट`,
          isRead: true,
          isStarred: true,
          receivedOrSentAt: new Date(Date.now() - 86400000 * 4),
        }
      ]
    });
  }
}

// GET /api/email — list emails by folder
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    await seedDefaultEmailsIfEmpty();

    const { folder = 'INBOX', search, starredOnly } = req.query;
    const where = {};

    if (folder && folder !== 'STARRED') {
      where.folder = folder;
    }
    if (folder === 'STARRED' || starredOnly === 'true') {
      where.isStarred = true;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { fromAddress: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const emails = await prisma.schoolEmail.findMany({
      where,
      orderBy: { receivedOrSentAt: 'desc' },
    });

    const unreadCount = await prisma.schoolEmail.count({
      where: { folder: 'INBOX', isRead: false },
    });

    return res.json({
      success: true,
      data: emails,
      unreadCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/email/:id — view email and mark as read
router.get('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const email = await prisma.schoolEmail.findUnique({ where: { id } });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found.' });

    if (!email.isRead) {
      await prisma.schoolEmail.update({
        where: { id },
        data: { isRead: true },
      });
      email.isRead = true;
    }

    return res.json({ success: true, data: email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/email/send — compose & send email
router.post('/send', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { toAddress, toName, ccAddress, subject, body, attachments } = req.body;

    if (!toAddress || !subject || !body) {
      return res.status(400).json({ success: false, message: 'प्राप्तकर्ताको इमेल (To), विषय (Subject) र सन्देश (Body) अनिवार्य छ।' });
    }

    const school = await prisma.school.findFirst();
    const fromAddress = school?.email || 'nepalsecondaryschool.bdn@gmail.com';
    const fromName = school?.name || 'श्री नेपाल माध्यमिक विद्यालय विश्रामपुर';

    const sentEmail = await prisma.schoolEmail.create({
      data: {
        folder: 'SENT',
        fromAddress,
        fromName,
        toAddress: String(toAddress).trim(),
        toName: toName ? String(toName).trim() : null,
        ccAddress: ccAddress ? String(ccAddress).trim() : null,
        subject: String(subject).trim(),
        body: String(body).trim(),
        isRead: true,
        attachments: attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null,
        receivedOrSentAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'इमेल सफलतापूर्वक पठाइयो (Email Sent Successfully)!',
      data: sentEmail,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PATCH /api/email/:id/star — toggle star
router.patch('/:id/star', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const email = await prisma.schoolEmail.findUnique({ where: { id } });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found.' });

    const updated = await prisma.schoolEmail.update({
      where: { id },
      data: { isStarred: !email.isStarred },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/email/:id — move to trash or delete permanently
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const email = await prisma.schoolEmail.findUnique({ where: { id } });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found.' });

    if (email.folder === 'TRASH') {
      await prisma.schoolEmail.delete({ where: { id } });
      return res.json({ success: true, message: 'इमेल स्थायी रूपमा हटाइयो (Permanently Deleted).' });
    } else {
      await prisma.schoolEmail.update({
        where: { id },
        data: { folder: 'TRASH' },
      });
      return res.json({ success: true, message: 'इमेल रद्दीटोकरी (Trash) मा सारियो।' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
