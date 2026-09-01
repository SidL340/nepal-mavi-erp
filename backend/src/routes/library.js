const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── BOOKS ─────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
      ];
    }
    const books = await prisma.book.findMany({ where, orderBy: { title: 'asc' } });
    return res.json({ success: true, data: books });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const book = await prisma.book.create({
      data: {
        ...req.body,
        totalCopies: parseInt(req.body.totalCopies || 1),
        availableCopies: parseInt(req.body.totalCopies || 1),
      },
    });
    return res.status(201).json({ success: true, data: book });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/library/bulk — add multiple books in bulk
router.post('/bulk', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ success: false, message: 'Books array is required.' });
    }

    const createdBooks = [];
    for (const b of books) {
      if (!b.title || !b.title.trim()) continue;
      const totalCopies = parseInt(b.totalCopies) || 1;
      const created = await prisma.book.create({
        data: {
          title: b.title.trim(),
          titleNepali: b.titleNepali?.trim() || null,
          author: b.author?.trim() || null,
          publisher: b.publisher?.trim() || null,
          isbn: b.isbn?.trim() || null,
          category: b.category?.trim() || 'General',
          totalCopies: totalCopies,
          availableCopies: totalCopies,
          shelfLocation: b.shelfLocation?.trim() || null,
          purchasedDateBs: b.purchasedDateBs?.trim() || null,
          sourceOfFund: b.sourceOfFund?.trim() || null,
        },
      });
      createdBooks.push(created);
    }

    return res.status(201).json({
      success: true,
      data: createdBooks,
      count: createdBooks.length,
      message: `Successfully added ${createdBooks.length} books in bulk.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const book = await prisma.book.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: book });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── ISSUE & RETURN ────────────────────────────────────────────────────────

router.get('/issues', authenticate, async (req, res) => {
  try {
    const { studentId, isReturned, overdue } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (isReturned !== undefined) where.isReturned = isReturned === 'true';

    const today = new Date().toISOString().slice(0, 10);
    if (overdue === 'true') {
      where.isReturned = false;
      where.dueDateAd = { lt: new Date() };
    }

    const issues = await prisma.libraryIssue.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        student: { select: { id: true, fullName: true, studentId: true } },
      },
      orderBy: { issuedDateAd: 'desc' },
    });
    return res.json({ success: true, data: issues });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/library/issues — issue a book
router.post('/issues', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const { bookId, studentId, issuedDateBs, issuedDateAd, dueDateBs, dueDateAd } = req.body;

    // Check availability
    const book = await prisma.book.findUnique({ where: { id: parseInt(bookId) } });
    if (!book || book.availableCopies < 1) {
      return res.status(400).json({ success: false, message: 'Book not available in library stock.' });
    }

    const safeIssuedAd = issuedDateAd && !isNaN(new Date(issuedDateAd).getTime())
      ? new Date(issuedDateAd)
      : new Date();

    const safeDueAd = dueDateAd && !isNaN(new Date(dueDateAd).getTime())
      ? new Date(dueDateAd)
      : new Date(Date.now() + 15 * 86400000);

    const [issue] = await prisma.$transaction([
      prisma.libraryIssue.create({
        data: {
          bookId: parseInt(bookId),
          studentId: parseInt(studentId),
          issuedDateBs: issuedDateBs || '2083-02-15',
          issuedDateAd: safeIssuedAd,
          dueDateBs: dueDateBs || '2083-02-30',
          dueDateAd: safeDueAd,
        },
        include: { book: true, student: true },
      }),
      prisma.book.update({
        where: { id: parseInt(bookId) },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);
    return res.status(201).json({ success: true, data: issue, message: 'Book issued successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/library/issues/:id/return — return an issued book
router.patch('/issues/:id/return', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const { returnedDateBs, returnedDateAd, fine = 0, remarks } = req.body;
    const issueId = parseInt(req.params.id);
    const issue = await prisma.libraryIssue.findUnique({ where: { id: issueId }, include: { book: true, student: true } });
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });

    if (issue.isReturned) {
      return res.status(400).json({ success: false, message: 'This book has already been marked as returned.' });
    }

    const safeReturnedAd = returnedDateAd && !isNaN(new Date(returnedDateAd).getTime())
      ? new Date(returnedDateAd)
      : new Date();

    const [updated] = await prisma.$transaction([
      prisma.libraryIssue.update({
        where: { id: issueId },
        data: {
          isReturned: true,
          returnedDateBs: returnedDateBs || '2083-03-01',
          returnedDateAd: safeReturnedAd,
          fine: parseFloat(fine) || 0,
          remarks: remarks || issue.remarks,
        },
        include: { book: true, student: true },
      }),
      prisma.book.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);
    return res.json({ success: true, data: updated, message: `Book "${issue.book?.title}" successfully returned!` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/library/issues/:id/reissue — renew/reissue book with new due date
router.patch('/issues/:id/reissue', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'), async (req, res) => {
  try {
    const issueId = parseInt(req.params.id);
    const { dueDateBs, dueDateAd, daysToAdd = 15, remarks } = req.body;

    const issue = await prisma.libraryIssue.findUnique({
      where: { id: issueId },
      include: { book: true, student: true },
    });
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });

    if (issue.isReturned) {
      return res.status(400).json({ success: false, message: 'Cannot reissue a book that has already been returned.' });
    }

    let safeDueAd;
    if (dueDateAd && !isNaN(new Date(dueDateAd).getTime())) {
      safeDueAd = new Date(dueDateAd);
    } else {
      const currentDue = issue.dueDateAd ? new Date(issue.dueDateAd) : new Date();
      safeDueAd = new Date(currentDue.getTime() + (parseInt(daysToAdd) || 15) * 86400000);
    }

    const updated = await prisma.libraryIssue.update({
      where: { id: issueId },
      data: {
        dueDateBs: dueDateBs || issue.dueDateBs,
        dueDateAd: safeDueAd,
        remarks: remarks || `Reissued on ${new Date().toISOString().slice(0, 10)}`,
      },
      include: { book: true, student: true },
    });

    return res.json({
      success: true,
      data: updated,
      message: `Book "${issue.book?.title}" successfully reissued to ${issue.student?.fullName}! New Due Date: ${updated.dueDateBs}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
