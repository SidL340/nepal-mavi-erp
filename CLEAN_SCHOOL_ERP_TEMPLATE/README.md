# 🏫 Nepal School ERP System
### नेपाल विद्यालय व्यवस्थापन प्रणाली

A comprehensive, web & mobile-friendly School Management ERP built for Nepali schools.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| Date | Bikram Sambat (BS) |
| SMS | Sparrow SMS |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm v9+

### 1. Clone & Setup

```bash
cd "NEPAL MAVI FULLSTACK"
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
# DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/nepal_school_erp"

npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev
```

Backend runs at: **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
# .env.local is already configured
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 🔑 Default Login

| Role | Username | Password |
|---|---|---|
| Super Admin | `admin` | `Admin@2081` |

After first login, change the admin password via Settings.

---

## 📋 Modules

| Module | Description |
|---|---|
| **Auth** | Multi-role login (Admin, Teacher, Student, Librarian, Accountant) |
| **School Profile** | School info, EMIS code, logo, bank accounts |
| **Students** | EMIS Excel import, manual add, bulk credential export |
| **Teachers** | Rastriya + Niji Sroth, Sanchaya Kosh, PAN, subjects |
| **Classes** | Class/Section management, student enrollment, subject assignment |
| **Academic** | Exam management, multi-title mark entry, marksheet, ledger, ranking |
| **Certificates** | Character Certificate + Transfer Certificate (print-ready) |
| **Attendance** | BS date auto-load, default-present, monthly/yearly reports, auto absent notice |
| **Finance — Income** | Govt budget (Central/Provincial/Local/District), own source, student fee |
| **Finance — Expense** | 20+ configurable heads (salary, ICT, stationery, events, bhata, etc.) |
| **Payroll** | Full GoN formula: Mool Talab, Grade, Bhata, SSK 10%/20%, Peshki, 1% tax, Traimasik |
| **Notices** | School/Class/Individual notices, Sparrow SMS integration |
| **Library** | Book catalog, issue/return, 15-day due, overdue notice |
| **Inventory** | Jinsi register — equipment, condition, lab items |

---

## 🗓️ EMIS Excel Import Format

The system accepts the standard Nepal IEMIS Excel format:

```
S.N | IEMIS Code | Current School | Student Id | FullName | Gender
Father Name | Mother Name | CurrentClass | Section | Year
Permanent Address | Temporary Address | DOB | Is Transferred
Mother Tongue | Disability Type | Age | Guardian Name | Guardian Contact Number
```

---

## 💰 Payroll Formula (Nepal GoN)

```
Grade Rakam           = Grade No × Grade Amount
Grade Sahit Talab     = Mool Talab + Grade Rakam
Jamma Bhata           = Mahangi + Pra-A + Sahayak + Incharge + Other Bhata
Jamma Talab+Bhata     = Grade Sahit Talab + Jamma Bhata
Traimasik Talan       = Jamma Talab Bhata × 3
Karmachari SSK 10%    = 10% of Grade Sahit Talab
Jamma Kati            = SSK10% + Sapati + Bima + Peshki
Baki Paaunu Parne     = Traimasik Talan - Jamma Kati
Kul Rakam             = Baki Paaunu Parne + Chaadparba + Peshki
Samajik Suraksha 1%   = 1% of Kul Rakam
Khud Paaunu Parne     = Kul Rakam - 1%
Employer SSK 20%      = 20% of Grade Sahit Talab
```

---

## 📱 Portals

- **Admin/Principal** → `/dashboard` — Full system access
- **Teacher** → `/teacher` — Classes, attendance, marks, notices
- **Student/Parent** → `/student` — Marks, attendance, fees, notices, library
- **Librarian** → `/dashboard/library` — Book management
- **Accountant** → `/dashboard/finance` — Finance module

---

## 📲 SMS (Sparrow SMS)

Add your Sparrow SMS API key to backend `.env`:
```
SMS_API_KEY=your_sparrow_sms_token
SMS_FROM=School
```

SMS is sent automatically when:
- Student marked absent (to guardian contact)
- Manual notice with "Send SMS" enabled

---

## 🖨️ Print Support

All certificates, marksheets, payslips, and receipts are print-optimized.
Use browser Print (Ctrl+P) or the Print button on each page.

---

## 🗄️ Database Commands

```bash
# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# View database (Prisma Studio)
npm run db:studio

# Re-seed
npm run db:seed

# Reset (CAUTION: deletes all data)
npm run db:reset
```
