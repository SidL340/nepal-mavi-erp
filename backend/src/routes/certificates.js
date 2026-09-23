const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Default built-in templates
const DEFAULT_TEMPLATES = [
  {
    type: 'CHARACTER',
    name: 'Character Certificate (चारित्रिक प्रमाणपत्र)',
    nameNepali: 'चारित्रिक प्रमाणपत्र',
    titleText: 'CHARACTER CERTIFICATE / चारित्रिक प्रमाणपत्र',
    bodyTemplate: 'This is to certify that Mr./Ms. {{studentName}}, son/daughter of Mr. {{fatherName}} and Mrs. {{motherName}}, resident of {{address}}, was a bonafide student of this school in Class {{class}} (Roll No: {{rollNo}}, EMIS ID: {{emisId}}). According to school records, his/her date of birth is {{dobBs}} B.S. ({{dobAd}} A.D.). During his/her stay at this institution, his/her conduct, moral character, and academic diligence were found to be {{character}}.\n\nWe wish him/her all the best and great success in all future educational pursuits.',
    borderStyle: 'CLASSIC_GOLD',
    signatory1Title: 'Class Teacher / कक्षा शिक्षक',
    signatory2Title: 'Exam Controller / परीक्षा नियन्त्रक',
    signatory3Title: 'Headmaster / प्रधानाध्यापक',
  },
  {
    type: 'TRANSFER',
    name: 'Transfer Certificate (स्थानान्तरण प्रमाणपत्र / TC)',
    nameNepali: 'स्थानान्तरण प्रमाणपत्र',
    titleText: 'TRANSFER / SCHOOL LEAVING CERTIFICATE',
    bodyTemplate: 'This is to certify that {{studentName}}, son/daughter of {{fatherName}}, studying in Class {{class}} (Roll No: {{rollNo}}) has left this school on {{issuedDateBs}} B.S. due to {{reason}}.\n\nAll school fees, library books, and other dues up to {{dueClearedUpto}} have been duly cleared. His/her character during the period was {{character}}.\n\nHe/She is hereby granted this Transfer Certificate to seek admission in any recognized institution.',
    borderStyle: 'MODERN_BLUE',
    signatory1Title: 'Class Teacher / कक्षा शिक्षक',
    signatory2Title: 'Accountant / लेखापाल',
    signatory3Title: 'Headmaster / प्रधानाध्यापक',
  },
  {
    type: 'BONAFIDE',
    name: 'Bonafide Student Certificate (प्रमाणीकरण पत्र)',
    nameNepali: 'अध्ययनरत प्रमाणीकरण प्रमाणपत्र',
    titleText: 'BONAFIDE STUDENT CERTIFICATE',
    bodyTemplate: 'This is to certify that {{studentName}} (EMIS ID: {{emisId}}), child of {{fatherName}}, is a regular and bonafide student of this institution currently studying in Class {{class}} for the academic session {{academicYear}}.\n\nThis certificate is issued upon guardian request for the purpose of {{purpose}}.',
    borderStyle: 'ORNATE',
    signatory1Title: 'Prepared By / तयार गर्ने',
    signatory2Title: 'Exam Incharge / परीक्षा संयोजक',
    signatory3Title: 'Principal / प्रधानाध्यापक',
  },
  {
    type: 'APPRECIATION',
    name: 'Certificate of Appreciation / Merit (प्रशंसा पत्र)',
    nameNepali: 'प्रशंसा पत्र / सम्मान पत्र',
    titleText: 'CERTIFICATE OF APPRECIATION',
    bodyTemplate: 'This certificate of appreciation is proudly presented to {{studentName}} of Class {{class}} in recognition of outstanding performance, excellence, and exceptional dedication demonstrated in {{eventOrSubject}} during the academic year {{academicYear}}.\n\nWe commend this remarkable achievement and encourage continuous pursuit of excellence.',
    borderStyle: 'ROYAL_RED',
    signatory1Title: 'Event Coordinator / संयोजक',
    signatory2Title: 'Vice Principal / सहायक प्र.अ.',
    signatory3Title: 'Principal / प्रधानाध्यापक',
  },
];

// GET /api/certificates — list all issued certificates
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { certificateNo: { contains: search } },
        { student: { fullName: { contains: search } } },
        { student: { studentId: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          student: {
            include: {
              classEnrollment: { where: { isActive: true }, include: { class: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.certificate.count({ where }),
    ]);

    return res.json({ success: true, data: certificates, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/certificates/templates — list customizable templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    let templates = await prisma.certificateTemplate.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    // Auto-seed default templates if none exist
    if (templates.length === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.certificateTemplate.create({ data: t }).catch(() => {});
      }
      templates = await prisma.certificateTemplate.findMany({ orderBy: { id: 'asc' } });
    }

    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/certificates/templates — save / update a certificate template
router.post('/templates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      type,
      name,
      nameNepali,
      titleText,
      bodyTemplate,
      borderStyle,
      watermarkEnabled,
      showQrCode,
      signatory1Title,
      signatory2Title,
      signatory3Title,
    } = req.body;

    if (!type || !bodyTemplate) {
      return res.status(400).json({ success: false, message: 'Template type and body are required.' });
    }

    const template = await prisma.certificateTemplate.upsert({
      where: { type },
      update: {
        name,
        nameNepali,
        titleText,
        bodyTemplate,
        borderStyle: borderStyle || 'CLASSIC_GOLD',
        watermarkEnabled: watermarkEnabled !== undefined ? watermarkEnabled : true,
        showQrCode: showQrCode !== undefined ? showQrCode : true,
        signatory1Title,
        signatory2Title,
        signatory3Title,
      },
      create: {
        type,
        name: name || `${type} Certificate`,
        nameNepali,
        titleText: titleText || `${type} CERTIFICATE`,
        bodyTemplate,
        borderStyle: borderStyle || 'CLASSIC_GOLD',
        watermarkEnabled: watermarkEnabled !== undefined ? watermarkEnabled : true,
        showQrCode: showQrCode !== undefined ? showQrCode : true,
        signatory1Title,
        signatory2Title,
        signatory3Title,
      },
    });

    return res.json({ success: true, data: template, message: 'प्रमाणपत्र ढाँचा (Template) सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/certificates/issue — issue a certificate to a student
router.post('/issue', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const {
      studentId,
      type,
      certificateNo,
      issuedDateBs,
      issuedDateAd,
      issuedBy,
      remarks,
      customData, // custom placeholders replacement or custom text
    } = req.body;

    if (!studentId || !type) {
      return res.status(400).json({ success: false, message: 'Student and certificate type are required.' });
    }

    let finalCertNo = certificateNo ? String(certificateNo).trim() : null;
    if (!finalCertNo) {
      const count = await prisma.certificate.count();
      const yr = issuedDateBs ? issuedDateBs.slice(0, 4) : '2081';
      finalCertNo = `CERT-${type.slice(0, 4)}-${yr}-${String(count + 1).padStart(4, '0')}`;
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId: parseInt(studentId),
        type,
        certificateNo: finalCertNo,
        issuedDateBs: issuedDateBs || '2081-01-01',
        issuedDateAd: issuedDateAd ? new Date(issuedDateAd) : new Date(),
        issuedBy: issuedBy || 'Examination Section',
        remarks: remarks || null,
        data: customData ? JSON.stringify(customData) : null,
      },
      include: {
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: certificate,
      message: `प्रमाणपत्र नं. ${finalCertNo} सफलतापूर्वक जारी गरियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/certificates/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: {
          include: {
            classEnrollment: { include: { class: true } },
          },
        },
      },
    });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/certificates/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.certificate.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'प्रमाणपत्र सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
