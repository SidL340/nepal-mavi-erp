const express = require('express');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to configure real Gmail/SMTP transporter if env vars are present
function getSmtpTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'nepalsecondaryschool.bdn@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

// GET /api/email — list emails by folder
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
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

// DELETE /api/email/empty-trash — empty all emails in trash folder
router.delete('/empty-trash', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const deleted = await prisma.schoolEmail.deleteMany({
      where: { folder: 'TRASH' },
    });
    return res.json({
      success: true,
      message: `रद्दीटोकरीका सबै ${deleted.count} इमेल स्थायी रूपमा हटाइयो (Trash emptied).`,
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

// POST /api/email/send — compose & send email (Real SMTP if configured, saved to Sent folder)
router.post('/send', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { toAddress, toName, ccAddress, subject, body, attachments } = req.body;

    if (!toAddress || !subject || !body) {
      return res.status(400).json({ success: false, message: 'प्राप्तकर्ताको इमेल (To), विषय (Subject) र सन्देश (Body) अनिवार्य छ।' });
    }

    const school = await prisma.school.findFirst();
    const fromAddress = school?.email || 'nepalsecondaryschool.bdn@gmail.com';
    const fromName = school?.name || 'श्री नेपाल माध्यमिक विद्यालय विश्रामपुर';

    let realMailSent = false;
    let smtpError = null;

    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: toAddress,
          cc: ccAddress || undefined,
          subject: subject,
          text: body,
        });
        realMailSent = true;
      } catch (mailErr) {
        console.warn('Real SMTP sending warning:', mailErr.message);
        smtpError = mailErr.message;
      }
    }

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

    const successMessage = realMailSent
      ? 'इमेल सफलतापूर्वक पठाइयो र वास्तविक मेलबक्सबाट डेलिभर गरियो (Real Email Dispatched via Gmail SMTP)!'
      : 'इमेल सुरक्षित गरियो र आधिकारिक पत्राचार अभिलेखमा दर्ता भयो (Email recorded in official mailbox)!';

    return res.json({
      success: true,
      message: successMessage,
      data: sentEmail,
      realMailSent,
      smtpError,
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
    const { permanent } = req.query;
    const email = await prisma.schoolEmail.findUnique({ where: { id } });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found.' });

    if (email.folder === 'TRASH' || permanent === 'true') {
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
