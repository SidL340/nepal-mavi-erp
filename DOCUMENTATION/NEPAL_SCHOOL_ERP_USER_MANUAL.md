# 📘 NEPAL SCHOOL ERP (नेपाल विद्यालय व्यवस्थापन प्रणाली)
## 🎓 Comprehensive User Manual & Operations Guide (विस्तृत प्रयोगकर्ता पुस्तिका)

**Software Version**: v1.0.0 (Production Release)  
**Developed by**: Nirmala Tech Innovations  
**Supported Standards**: Ministry of Education, Science & Technology (MoEST) Nepal / Center for Education and Human Resource Development (CEHRD)  

---

# 📑 TABLE OF CONTENTS (विषय सूची)
1. [Introduction & System Overview (परिचय तथा प्रणाली विवरण)](#1-introduction--system-overview)
2. [User Roles & Access Permissions (प्रयोगकर्ता भूमिका तथा पहुँच)](#2-user-roles--access-permissions)
3. [Logging into the System (प्रणालीमा लगइन कसरी गर्ने)](#3-logging-into-the-system)
4. [School Profile & Academic Year Setup (विद्यालय विवरण तथा शैक्षिक सत्र सेटिङ)](#4-school-profile--academic-year-setup)
5. [Class & Subject Management (कक्षा तथा विषय व्यवस्थापन)](#5-class--subject-management)
6. [Student Management & Registration (विद्यार्थी भर्ना तथा अभिलेख)](#6-student-management--registration)
   - [Individual Registration (व्यक्तिगत दर्ता)](#61-individual-registration)
   - [Bulk Excel Import (IEMIS ढाँचामा एकमुष्ट एक्सेल आयात)](#62-bulk-excel-import)
   - [Credentials Card Printing with QR Code (लगइन कार्ड तथा QR कोड प्रिन्ट)](#63-credentials-card-printing-with-qr-code)
7. [Daily Student Attendance (दैनिक विद्यार्थी हाजिरी)](#7-daily-student-attendance)
8. [Examinations, Marks & Report Cards (परीक्षा, प्राप्ताङ्क तथा लब्धाङ्क पत्र)](#8-examinations-marks--report-cards)
9. [Certificates: Character & Transfer (प्रमाणपत्र: चारित्रिक तथा स्थानान्तरण)](#9-certificates-character--transfer)
10. [Finance Hub & Fee Collection (आर्थिक व्यवस्थापन तथा शुल्क संकलन)](#10-finance-hub--fee-collection)
    - [Fee Structure & Fee Heads (शुल्क शीर्षक तथा दर निर्धारण)](#101-fee-structure--fee-heads)
    - [Collecting Student Fees & Issuing Receipts (शुल्क संकलन तथा रसिद जारी)](#102-collecting-student-fees--issuing-receipts)
    - [Government Budget & Own Source Income (सरकारी बजेट तथा आन्तरिक आम्दानी)](#103-government-budget--own-source-income)
    - [Expense Vouchers & Party Ledger (खर्च भौचर तथा भुक्तानी खाता)](#104-expense-vouchers--party-ledger)
    - [General Double-Entry Journal Ledger (दोहोरो लेखा प्रणाली भौचर तथा खाता)](#105-general-double-entry-journal-ledger)
11. [Nepal Government Teacher Payroll (नेपाल सरकार शिक्षक तलब भत्ता प्रणाली)](#11-nepal-government-teacher-payroll)
    - [Salary Scales, Grade Pay & Allowances (तलबमान, ग्रेड तथा भत्ता)](#111-salary-scales-grade-pay--allowances)
    - [Deductions: Provident Fund 10%, CIT, Insurance (सञ्चय कोष, कर तथा कट्टी)](#112-deductions-provident-fund-10-cit-insurance)
    - [Traimasik Talabi Bhibaran Printing (त्रैमासिक तलब विवरण प्रिन्ट)](#113-traimasik-talabi-bhibaran-printing)
12. [Library Management (पुस्तकालय व्यवस्थापन)](#12-library-management)
13. [Inventory / Jinsi Khata (जिन्सी खाता व्यवस्थापन)](#13-inventory--jinsi-khata)
14. [Notice Board & Automated SMS Alerts (सूचना पाटी तथा SMS अलर्ट)](#14-notice-board--automated-sms-alerts)
15. [User Administration & Password Management (प्रयोगकर्ता तथा पासवर्ड व्यवस्थापन)](#15-user-administration--password-management)
16. [Database Backup & Data Safety (डाटाबेश ब्याकअप तथा सुरक्षा)](#16-database-backup--data-safety)
17. [Frequently Asked Questions (बारम्बार सोधिने प्रश्नहरू - FAQ)](#17-frequently-asked-questions)

---

# 1. Introduction & System Overview
Nepal School ERP is a modern, web-based, multi-user school management platform tailored specifically for secondary and model schools in Nepal. It combines academic administration, student records, government-standard financial accounting, and official payroll calculations into a unified, secure portal.

### Key Highlights:
- **Bikram Sambat (BS) Native**: Seamless support for Nepali dates (e.g., 2081-05-17).
- **Official Print Layouts**: Character Certificates, Transfer Certificates, Fee Receipts, and Payroll Slips designed with official Government of Nepal letterheads.
- **Role-Based Security**: Strict access control for Administrators, Accountants, Teachers, Students, and Librarians.

---

# 2. User Roles & Access Permissions

| Role | Nepali Equivalent | Accessible Modules |
|---|---|---|
| **SUPER_ADMIN** | प्रमुख प्रशासक | Complete uninhibited access to all modules, backups, settings, and users. |
| **ADMIN** | विद्यालय प्रशासन / प्र.अ. | Academic, student, teacher, certificates, attendance, notices, and finance review. |
| **ACCOUNTANT** | लेखापाल | Income, Expenses, Fee Collection, Teacher Payroll, Journal Vouchers, Parties. |
| **TEACHER** | शिक्षक | Assigned Class Attendance, Mark Entry, Homework/Daily Taught Logs, Notices. |
| **STUDENT / PARENT** | विद्यार्थी / अभिभावक | Personal Attendance, Terminal Report Cards, Fee Dues, Library Books, Notices. |
| **LIBRARIAN** | पुस्तकालय प्रमुख | Book Cataloging, Issue/Return, Overdue Fine Collection. |

---

# 3. Logging into the System
1. Open your web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
2. Navigate to your school's ERP URL (e.g. `https://app.nepalssb.edu.np/login`).
3. Enter your **Username / Email** and **Password**.
4. Click **"Sign In (लगइन गर्नुहोस्)"**.
5. Upon successful authentication, you will be redirected to the relevant Dashboard based on your assigned role.

---

# 4. School Profile & Academic Year Setup
*Path: Dashboard ➔ School Profile (विद्यालय विवरण र सेटिङ)*

### 4.1 School Profile (विद्यालय विवरण)
- **School Name (English & Nepali)**: The official name printed on all reports.
- **IEMIS Code**: The official Ministry of Education school code.
- **Level & Type**: Secondary (माध्यमिक) / Community (सामुदायिक) or Institutional (संस्थागत).
- **Address, Phone, Email & Website**: Displayed on certificate headers and fee slips.
- **Official School Logo & Stamp Seal**: Upload your school's PNG/JPG logo and round official seal stamp. Once uploaded, they automatically appear on all print documents.

### 4.2 Academic Years (शैक्षिक सत्र)
- Add new academic sessions (e.g., `2081-82`, `2082-83`).
- Set Start Date BS (`2081-04-01`) and End Date BS (`2082-03-31`).
- Mark the active session as **ACTIVE (सक्रिय)**.

### 4.3 Bank Accounts (विद्यालयका बैंक खाताहरू)
- Register official school operating bank accounts (e.g., Rastriya Banijya Bank, Nepal Bank Ltd).
- Used during Fee Collection, Income deposits, and Expense voucher disbursements.

---

# 5. Class & Subject Management
*Path: Dashboard ➔ Classes & Subjects (कक्षा र विषय)*

1. **Creating Classes**: Click **"+ Add Class"**, enter Class Name (e.g., *Class 10*), Section (*A, B, C*), and assign the Class Teacher.
2. **Assigning Subjects**:
   - Go to the **Subjects (विषयहरू)** tab.
   - Click **"+ Add Subject"** to register compulsory or elective subjects.
   - Link subjects to classes and assign Subject Teachers.

---

# 6. Student Management & Registration
*Path: Dashboard ➔ Students (विद्यार्थीहरू)*

### 6.1 Individual Registration (व्यक्तिगत दर्ता)
1. Click **"+ Add Student (नयाँ विद्यार्थी भर्ना)"**.
2. Fill in the student details:
   - Full Name (English & Nepali), Gender, Date of Birth (BS), Blood Group.
   - Father Name, Mother Name, Guardian Contact Number.
   - Permanent & Temporary Address.
   - Assign Class, Section, and Roll Number.
3. Click **"Save Student"**. A unique Student ID and login account are generated automatically.

### 6.2 Bulk Excel Import (IEMIS ढाँचामा एकमुष्ट एक्सेल आयात)
1. Click **"Bulk Import (एक्सेलबाट आयात)"**.
2. Download the standard Excel template or upload your official IEMIS export (.xlsx).
3. Select the target Class & Section.
4. Click **"Import Students"**. Hundreds of students are enrolled and sorted naturally by roll number in seconds!

### 6.3 Credentials Card Printing with QR Code
1. On the Students list, click **"Print Login Slips (लगइन कार्ड प्रिन्ट)"**.
2. Select the class or all students.
3. The system renders 8-to-a-page printable ID credential cards containing:
   - School Name & Seal
   - Student Name, Class & Roll No
   - Username & Temporary Password
   - **QR Code** for instant one-scan mobile login!

---

# 7. Daily Student Attendance
*Path: Dashboard ➔ Attendance (हाजिरी)*

1. Select **Class** and verify **Today's BS Date** (auto-loaded).
2. Click **"Load Students"**.
3. By default, all enrolled students are marked **Present (उपस्थित - Green)**.
4. Simply click to mark **Absent (अनुपस्थित - Red)**, **Late (ढिलो - Yellow)**, or **Leave (बिदा - Blue)**.
5. Click **"Save Attendance (हाजिरी सुरक्षित गर्नुहोस्)"**.
6. **Automated Absent Alert**: If enabled, parents of absent students receive immediate notice reminders!

---

# 8. Examinations, Marks & Report Cards
*Path: Dashboard ➔ Exams & Marks (परीक्षा र लब्धाङ्क)*

1. **Creating an Exam**: Add First Terminal, Second Terminal, or Annual Examination with BS date range.
2. **Subject Configuration**: Configure Theory Full Marks (e.g. 75), Practical Full Marks (e.g. 25), and Pass Marks.
3. **Mark Entry**: Teachers or Admins select Exam ➔ Class ➔ Subject and enter marks directly in an interactive grid.
4. **Marksheet / Grade-sheet Printing**:
   - Generates individual terminal report cards compliant with CDC letter-grading standards (GPA, Grade Points, Remarks).
   - Generates full **Class Ledgers (लब्धाङ्क सूची)** with single-click PDF export.

---

# 9. Certificates: Character & Transfer (CC/TC)
*Path: Dashboard ➔ Certificates (प्रमाणपत्र)*

1. Select **Character Certificate (चारित्रिक प्रमाणपत्र)** or **Transfer Certificate (स्थानान्तरण प्रमाणपत्र)**.
2. Search and select the student.
3. Review auto-filled academic records, conduct rating, and admission/leaving dates.
4. Click **"Generate & Print"**. The document renders with official school letterhead, watermark seal, and Principal signature block.

---

# 10. Finance Hub & Fee Collection
*Path: Dashboard ➔ Finance (वित्तीय व्यवस्थापन)*

### 10.1 Fee Heads & Class Fee Matrix
- Define monthly/annual fee heads (Tuition Fee, Exam Fee, Computer Lab, Transportation).
- In **Class-Wise Fee Matrix**, assign specific rates per class (e.g., Class 10 = Rs. 1,500/mo, Class 1 = Rs. 600/mo).

### 10.2 Collecting Fees & Generating Receipts
1. Go to **Fee Collection (शुल्क संकलन)** or click **"Collect Fee (शुल्क)"** next to any student.
2. The student's name, class, and fee dues load automatically.
3. Select the **Fee Head**, enter the **Amount (रू)** and **Payment Mode** (Cash / Bank Transfer / QR / Cheque).
4. Click **"Collect Fee & Issue Receipt"**.
5. A beautifully formatted, printable **Official Fee Receipt (शुल्क रसिद)** with unique receipt number (e.g. `RCP-2026-00001`) pops up immediately.

### 10.3 Government Budget & Own Source Income
- Record central, provincial, and local government grants (e.g., Salary Subsidy, Scholarship Fund, Infrastructure Budget) with voucher numbers and depositing bank accounts.

### 10.4 Expense Vouchers & Parties
- Record administrative expenses, maintenance, stationeries, and utility bills.
- Assign payments to registered vendors/parties with Bill/PAN references.

### 10.5 General Double-Entry Journal Ledger
- View unified debit/credit financial registers with date filtering and audit trail.

---

# 11. Nepal Government Teacher Payroll (शिक्षक तलब भत्ता)
*Path: Dashboard ➔ Teacher Payroll (शिक्षक तलब भत्ता)*

The system implements the exact **Government of Nepal Teacher Salary & Allowance Formula**:

### 11.1 Salary Calculation Matrix
$$\text{Grade Amount} = \text{Grade No} \times \text{Grade Rate}$$
$$\text{Grade-Included Salary (ग्रेड सहित तलब)} = \text{Basic Salary (मूल तलब)} + \text{Grade Amount}$$
$$\text{Total Allowances (जम्मा भत्ता)} = \text{Mahangi} + \text{Pra-A} + \text{Incharge} + \text{Other}$$
$$\text{Traimasik Total (त्रैमासिक तलब भत्ता)} = (\text{Grade Salary} + \text{Allowances}) \times 3$$

### 11.2 Government Deductions
- **Karmachari Sanchaya Kosh (१०% कट्टी)**: $10\%$ of Grade-Included Salary.
- **Kosh Loan Repayment (सापटी कट्टी)**, **Insurance (बीमा)**, **Peshki (पेश्की)**.
- **Festival / Dashain Kharcha (चाडपर्व खर्च)** (Optional 1 month salary).
- **Social Security Tax (१% सामाजिक सुरक्षा कर)**.
- **Net Payable (खुद पाउने रकम)**: Automatically computed in real time!

### 11.3 Printing Traimasik Salary Slips
- Generates official government-format salary disbursement sheets ready for municipal bank transfer submission.

---

# 12. Library Management
*Path: Dashboard ➔ Library (पुस्तकालय)*

1. **Book Cataloging**: Register titles, authors, publishers, ISBNs, shelf numbers, and copy counts.
2. **Issue Book**: Search student or teacher, select book, and assign return due date (BS).
3. **Return Book & Fine**: Automatically detects overdue days and calculates fine amounts.

---

# 13. Inventory / Jinsi Khata (जिन्सी खाता)
*Path: Dashboard ➔ Inventory (जिन्सी खाता)*

- Manage school assets (Furniture, IT Hardware, Science Lab Equipment, Sports Gear).
- Track item condition: **Good (राम्रो)**, **Fair (मध्यम)**, **Poor (मर्मत योग्य)**, **Damaged (बिग्रिएको)**.
- Maintain stock registers for annual government audits.

---

# 14. Notice Board & SMS Broadcasting
*Path: Dashboard ➔ Notices & SMS (सूचना पाटी)*

- Broadcast announcements to all school members, specific classes, or individual parents.
- Target categories: General Notices, Exam Schedules, Emergency Holidays, Fee Reminders, Absentee Alerts.

---

# 15. User Administration & Password Management
*Path: Dashboard ➔ User Management (प्रयोगकर्ता व्यवस्थापन)*

- Create additional Teacher, Accountant, or Admin user accounts.
- **1-Click Password Reset**: Instantly generate new secure temporary passwords for any student or teacher who forgets their credentials.
- Export and print bulk login slips anytime.

---

# 16. Database Backup & Data Safety
*Path: Dashboard ➔ School Profile ➔ System Backup & Restore*

- **1-Click Snapshot**: Click **"Generate Backup (ब्याकअप लिनुहोस्)"** to download a complete, timestamped JSON copy of the entire database.
- **Safe Development**: Always take a backup before performing major bulk updates or system migrations.

---

# 17. Frequently Asked Questions (FAQ)

**Q1: How do I change the School Name or Logo shown on Certificates?**  
A: Go to *Dashboard ➔ School Profile*, update the School Name (English & Nepali) and upload your new Logo and Round Seal, then click *Save Profile*. All certificates and receipts will update immediately.

**Q2: Can we access the ERP from smartphones or tablets?**  
A: Yes! The system is 100% responsive and works on mobile phones, tablets, laptops, and desktop computers.

**Q3: How do we start a new Academic Session next year?**  
A: Go to *School Profile ➔ Academic Years*, click *+ Add Academic Year*, enter `2082-83`, and toggle *Active*. All student marks and fees will start fresh for the new year while historical records remain safely archived.

---

*End of User Manual — For technical assistance or custom modules, contact Nirmala Tech Innovations.*
