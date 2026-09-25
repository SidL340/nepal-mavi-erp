const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_INCHARGE_TASKS = {
  EXAM_INCHARGE: [
    {
      title: 'परीक्षा तालिका तथा रुटिन तयारी (Prepare Exam Routine)',
      description: 'आगामी परीक्षाको लागि कक्षागत परीक्षा तालिका, विषय तथा समय निर्धारण गर्ने।',
      category: 'EXAM',
      priority: 'HIGH',
    },
    {
      title: 'प्रश्नपत्र सङ्कलन, रुजु तथा मुद्रण (Question Paper Collection & Printing)',
      description: 'सबै विषय शिक्षकहरूबाट प्रश्नपत्र समयमै सङ्कलन गरी मुद्रण तथा सिलबन्दी गर्ने।',
      category: 'EXAM',
      priority: 'URGENT',
    },
    {
      title: 'परीक्षा हल व्यवस्थापन तथा सिट प्लानिङ (Exam Hall & Seat Planning)',
      description: 'विद्यार्थीहरूको रोल नं. अनुसार बेन्च तथा हलको सिट व्यवस्थापन गर्ने।',
      category: 'EXAM',
      priority: 'HIGH',
    },
    {
      title: 'प्रवेश पत्र वितरण तथा उपस्थिति रेकर्ड (Admit Card & Attendance Log)',
      description: 'विद्यार्थीहरूलाई प्रवेश पत्र वितरण र परीक्षाको दिन हाजिरी रुजु गर्ने।',
      category: 'EXAM',
      priority: 'MEDIUM',
    },
    {
      title: 'प्राप्ताङ्क प्रविष्टि अनुगमन तथा लेजर तयारी (Marks Entry & Ledger Tabulation)',
      description: 'विषय शिक्षकहरूबाट प्राप्ताङ्क सफ्टवेयरमा प्रविष्टि गराउने र लेजर रुजु गर्ने।',
      category: 'EXAM',
      priority: 'HIGH',
    },
    {
      title: 'नतिजा प्रकाशन तथा लब्धाङ्क पत्र वितरण (Result Publication & Report Cards)',
      description: 'परीक्षा समितिको बैठक बसी नतिजा प्रमाणीकरण तथा ग्रेडसिट वितरण गर्ने।',
      category: 'EXAM',
      priority: 'HIGH',
    },
  ],
  LIBRARIAN: [
    {
      title: 'नयाँ पुस्तक दर्ता तथा क्याटलग अद्यावधिक (Book Cataloging & Accession)',
      description: 'नयाँ प्राप्त भएका सबै पुस्तकहरू दर्ता गरी रैक तथा विधा अनुसार क्रमबद्ध राख्ने।',
      category: 'LIBRARY',
      priority: 'MEDIUM',
    },
    {
      title: 'दैनिक पुस्तक निकासा तथा फिर्ता अभिलेख (Daily Issue & Return Auditing)',
      description: 'विद्यार्थी तथा शिक्षकहरूलाई पुस्तक निकासा तथा समयमै फिर्ता अभिलेख राख्ने।',
      category: 'LIBRARY',
      priority: 'MEDIUM',
    },
    {
      title: 'म्याद नाघेका पुस्तकहरूको ताकेता (Overdue Books Recovery & Follow-up)',
      description: 'म्याद नाघेका पुस्तकहरूको सूची निकाली सम्बन्धित विद्यार्थीलाई बुझाउन ताकेता गर्ने।',
      category: 'LIBRARY',
      priority: 'HIGH',
    },
    {
      title: 'पुस्तकालय रैक व्यवस्थापन तथा पुस्तक संरक्षण (Library Shelving & Maintenance)',
      description: 'किताबहरू च्यातिएको मर्मत गर्ने र पुस्तक कुना सफा सुग्घर राख्ने।',
      category: 'LIBRARY',
      priority: 'LOW',
    },
  ],
  ACCOUNTANT: [
    {
      title: 'मासिक शुल्क बिलिङ तथा सङ्कलन (Monthly Fee Billing & Invoicing)',
      description: 'सबै कक्षाका विद्यार्थीहरूको मासिक शुल्क बिलिङ तथा भुक्तानी भौचर जारी गर्ने।',
      category: 'ACCOUNT',
      priority: 'HIGH',
    },
    {
      title: 'दैनिक आम्दानी तथा खर्च भौचर प्रविष्टि (Daily Income & Expense Posting)',
      description: 'विद्यालयको दैनिक आम्दानी र प्रशासनिक खर्च सफ्टवेयरमा भौचरसहित प्रविष्टि गर्ने।',
      category: 'ACCOUNT',
      priority: 'HIGH',
    },
    {
      title: 'कर्मचारी तलब तथा पेरोल गणना (Monthly Staff Payroll & Salary Sheets)',
      description: 'शिक्षक तथा कर्मचारीहरूको मासिक तलब, भत्ता र कट्टी हिसाब गरी तलब भुक्तानी तयार गर्ने।',
      category: 'ACCOUNT',
      priority: 'URGENT',
    },
    {
      title: 'बक्यौता शुल्क ताकेता तथा सङ्कलन (Fee Dues Follow-up & Recovery)',
      description: 'शुल्क तिर्न बाँकी रहेका विद्यार्थी अभिभावकहरूलाई ताकेता सूचना पठाउने।',
      category: 'ACCOUNT',
      priority: 'HIGH',
    },
    {
      title: 'मासिक वित्तीय विवरण तथा बजेट मिलान (Financial Reports & Budget Reconciliation)',
      description: 'मासिक आय-व्यय विवरण तयार गरी प्रधानाध्यापक/व्यवस्थापन समितिसमक्ष पेश गर्ने।',
      category: 'ACCOUNT',
      priority: 'HIGH',
    },
  ],
  DISCIPLINE_INCHARGE: [
    {
      title: 'दैनिक प्रार्थना सभा तथा पोशाक निरीक्षण (Morning Assembly & Uniform Check)',
      description: 'बिहानी प्रार्थना सभाको सञ्चालन तथा विद्यार्थी पोशाक, नङ, कपाल सरसफाइ निरीक्षण गर्ने।',
      category: 'DISCIPLINE',
      priority: 'MEDIUM',
    },
    {
      title: 'विद्यार्थी समयपालना तथा ढिलाइ नियन्त्रण (Punctuality & Late Arrival Monitoring)',
      description: 'ढिला आउने विद्यार्थीहरूको लगत राख्ने र नियमित समयपालना गराउने।',
      category: 'DISCIPLINE',
      priority: 'MEDIUM',
    },
    {
      title: 'विद्यालय अनुशासन आचारसंहिता कार्यान्वयन (Code of Conduct Enforcement)',
      description: 'विद्यालय परिसरभित्र शान्ति, सुरक्षा र मर्यादित वातावरण कायम राख्ने।',
      category: 'DISCIPLINE',
      priority: 'HIGH',
    },
  ],
  ECA_INCHARGE: [
    {
      title: 'वार्षिक खेलकुद तथा ECA क्यालेन्डर तयारी (Annual Sports & ECA Calendar)',
      description: 'वर्षभरि सञ्चालन हुने खेलकुद, अतिरिक्त क्रियाकलाप तथा प्रतियोगिताहरूको कार्ययोजना बनाउने।',
      category: 'ECA',
      priority: 'MEDIUM',
    },
    {
      title: 'अन्तरसदनात्मक खेलकुद प्रतियोगिता सञ्चालन (Inter-House Sports Tournaments)',
      description: 'भलिबल, फुटबल, दौड, चेस, ब्याडमिन्टन लगायत खेलकुद प्रतियोगिता सञ्चालन गर्ने।',
      category: 'ECA',
      priority: 'HIGH',
    },
    {
      title: 'सांस्कृतिक, हाजिरीजवाफ तथा वक्तृत्वकला कार्यक्रम (Cultural & Quiz Contests)',
      description: 'शुक्रबारे अतिरिक्त क्रियाकलापमा वक्तृत्वकला, वादविवाद, हाजिरीजवाफ आयोजना गर्ने।',
      category: 'ECA',
      priority: 'MEDIUM',
    },
  ],
  ACADEMIC_COORDINATOR: [
    {
      title: 'दैनिक कक्षा रुटिन तथा शिक्षक प्रतिस्थापन (Daily Routine & Teacher Substitution)',
      description: 'अनुपस्थित शिक्षकको स्थानमा अन्य शिक्षक खटाई कक्षा निर्वाध सञ्चालन गर्ने।',
      category: 'ACADEMIC',
      priority: 'URGENT',
    },
    {
      title: 'पाठ्ययोजना तथा शैक्षिक सामग्री अनुगमन (Lesson Plan & Teaching Aids Review)',
      description: 'शिक्षकहरूको दैनिक पाठ्ययोजना र शैक्षिक सामग्री प्रयोगको अनुगमन गर्ने।',
      category: 'ACADEMIC',
      priority: 'HIGH',
    },
    {
      title: 'सिकाइ उपलब्धि मूल्याङ्कन तथा उपचारात्मक शिक्षण (Remedial Teaching & Review)',
      description: 'कमजोर विद्यार्थीहरूको पहिचान गरी थप उपचारात्मक कक्षाको व्यवस्था गर्ने।',
      category: 'ACADEMIC',
      priority: 'MEDIUM',
    },
  ],
  LAB_INCHARGE: [
    {
      title: 'कम्प्युटर तथा विज्ञान ल्याब उपकरण निरीक्षण (Computer & Science Lab Maintenance)',
      description: 'कम्प्युटर, इन्टरनेट, सफ्टवेयर र विज्ञान उपकरणहरूको कार्यक्षमता नियमित जाँच गर्ने।',
      category: 'ACADEMIC',
      priority: 'MEDIUM',
    },
    {
      title: 'प्रयोगात्मक कक्षा तालिका कार्यान्वयन (Practical Class Schedule Management)',
      description: 'सबै कक्षाका विद्यार्थीहरूको प्रयोगात्मक कक्षा तालिका मिलाउने र प्रयोग गराउने।',
      category: 'ACADEMIC',
      priority: 'MEDIUM',
    },
  ],
};

// GET /api/staff-tasks - List tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { teacherId, status, category, priority, search } = req.query;
    const where = {};

    // If teacher is logged in and not admin, only show their tasks
    if (req.user.role === 'TEACHER' && req.user.teacher?.id) {
      where.assignedToId = req.user.teacher.id;
    } else if (teacherId) {
      where.assignedToId = parseInt(teacherId);
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { remarks: { contains: search } },
      ];
    }

    const tasks = await prisma.staffTask.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            post: true,
            inchargeRole: true,
            inchargeTitle: true,
            shreni: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks: ' + err.message });
  }
});

// GET /api/staff-tasks/summary - Summary stats of incharge duties & tasks
router.get('/summary', authenticate, async (req, res) => {
  try {
    const totalTasks = await prisma.staffTask.count();
    const pendingTasks = await prisma.staffTask.count({ where: { status: 'PENDING' } });
    const inProgressTasks = await prisma.staffTask.count({ where: { status: 'IN_PROGRESS' } });
    const completedTasks = await prisma.staffTask.count({ where: { status: 'COMPLETED' } });

    const incharges = await prisma.teacher.findMany({
      where: {
        isActive: true,
        inchargeRole: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        fullNameNepali: true,
        post: true,
        inchargeRole: true,
        inchargeTitle: true,
        shreni: true,
        phone: true,
        photoUrl: true,
        tasks: {
          select: { id: true, status: true, priority: true, title: true },
        },
      },
    });

    return res.json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        incharges,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch task summary: ' + err.message });
  }
});

// POST /api/staff-tasks - Create new task
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      assignedToId,
      priority,
      status,
      dueDateBs,
      remarks,
    } = req.body;

    if (!title || !assignedToId) {
      return res.status(400).json({ success: false, message: 'Task title and assigned staff are required.' });
    }

    const task = await prisma.staffTask.create({
      data: {
        title,
        description,
        category: category || 'GENERAL',
        assignedToId: parseInt(assignedToId),
        assignedById: req.user.id,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        dueDateBs,
        remarks,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            post: true,
            inchargeRole: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: task, message: 'Task assigned successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create task: ' + err.message });
  }
});

// POST /api/staff-tasks/auto-assign-role-tasks - Auto generate standard incharge tasks
router.post('/auto-assign-role-tasks', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { teacherId, inchargeRole, dueDateBs } = req.body;
    if (!teacherId || !inchargeRole) {
      return res.status(400).json({ success: false, message: 'Teacher ID and Incharge Role are required.' });
    }

    const templateList = DEFAULT_INCHARGE_TASKS[inchargeRole] || [];
    if (templateList.length === 0) {
      return res.status(400).json({ success: false, message: 'No standard tasks defined for this role.' });
    }

    const createdTasks = await prisma.$transaction(
      templateList.map((tpl) =>
        prisma.staffTask.create({
          data: {
            title: tpl.title,
            description: tpl.description,
            category: tpl.category,
            priority: tpl.priority,
            status: 'PENDING',
            assignedToId: parseInt(teacherId),
            assignedById: req.user.id,
            dueDateBs: dueDateBs || null,
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      count: createdTasks.length,
      data: createdTasks,
      message: `Successfully assigned ${createdTasks.length} standard responsibilities/tasks for this role!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to auto-assign tasks: ' + err.message });
  }
});

// PUT /api/staff-tasks/:id - Edit task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.staffTask.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Teachers can update status and remarks of their own tasks
    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== existing.assignedToId) {
      return res.status(403).json({ success: false, message: 'You can only update your own assigned tasks.' });
    }

    const {
      title,
      description,
      category,
      assignedToId,
      priority,
      status,
      dueDateBs,
      completedAtBs,
      remarks,
    } = req.body;

    const data = {};
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (category !== undefined) data.category = category;
      if (assignedToId !== undefined) data.assignedToId = parseInt(assignedToId);
      if (priority !== undefined) data.priority = priority;
      if (dueDateBs !== undefined) data.dueDateBs = dueDateBs;
    }

    if (status !== undefined) data.status = status;
    if (remarks !== undefined) data.remarks = remarks;
    if (completedAtBs !== undefined) data.completedAtBs = completedAtBs;

    if (status === 'COMPLETED' && !existing.completedAtAd) {
      data.completedAtAd = new Date();
    } else if (status !== 'COMPLETED') {
      data.completedAtAd = null;
      data.completedAtBs = null;
    }

    const updated = await prisma.staffTask.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            post: true,
          },
        },
      },
    });

    return res.json({ success: true, data: updated, message: 'Task updated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update task: ' + err.message });
  }
});

// PATCH /api/staff-tasks/:id/status - Quick status update
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, remarks, completedAtBs } = req.body;

    const existing = await prisma.staffTask.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== existing.assignedToId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not your assigned task.' });
    }

    const data = { status };
    if (remarks !== undefined) data.remarks = remarks;
    if (status === 'COMPLETED') {
      data.completedAtAd = new Date();
      if (completedAtBs) data.completedAtBs = completedAtBs;
    } else {
      data.completedAtAd = null;
      data.completedAtBs = null;
    }

    const updated = await prisma.staffTask.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: updated, message: `Task marked as ${status}!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update task status: ' + err.message });
  }
});

// DELETE /api/staff-tasks/:id - Delete task
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.staffTask.delete({ where: { id } });
    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to delete task: ' + err.message });
  }
});

module.exports = {
  router,
  DEFAULT_INCHARGE_TASKS,
};
