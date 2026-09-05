# 🤝 PROJECT HANDOVER & TECHNICAL SPECIFICATION
## Nepal School ERP System — Production Handover Document

**Client**: School Administration / Educational Board  
**Deliverable**: Nepal School ERP Enterprise Full-Stack System  
**Release Version**: v1.0.0 (Production Master)  
**Handover Date**: Bhadra 2081 / September 2026  
**Provider**: Nirmala Tech Innovations  

---

## 1. EXECUTIVE SUMMARY & DELIVERABLES
This document certifies the completion and handover of the **Nepal School ERP System**. The software is fully deployed, operational, and tested in accordance with the specified requirements for community and secondary schools in Nepal.

### Included Deliverables:
1. **Full Production Source Code**: Complete Next.js 16 frontend and Express/Prisma backend repository.
2. **Cloud Database Architecture**: Dedicated PostgreSQL instance configured with connection pooling and automated SSL encryption.
3. **White-Label Distribution Template**: Standalone, clean template package located at `CLEAN_SCHOOL_ERP_TEMPLATE/` for deploying to other schools.
4. **Comprehensive User Manual**: Operational guide located at `DOCUMENTATION/NEPAL_SCHOOL_ERP_USER_MANUAL.md`.
5. **Initial Super Admin Credentials**: Provided under separate secure communication.

---

## 2. TECHNICAL SPECIFICATIONS & ARCHITECTURE

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router / Turbopack) | 16.3.3 | High-performance interactive UI & print rendering |
| **Styling & Icons** | Tailwind CSS & Lucide React | Latest | Modern responsive dashboard styling |
| **State & API Management** | TanStack React Query & Axios | v5 | Real-time cache invalidation and async data fetching |
| **Backend Framework** | Node.js + Express REST API | v20+ / Express 4 | Secure high-throughput business logic & endpoints |
| **Database & ORM** | PostgreSQL + Prisma ORM | Prisma 6.19.3 | Type-safe relational database with auto-migrations |
| **Calendar System** | Bikram Sambat (BS) Engine | Native | Bikram Sambat date converter and formatting |
| **Authentication** | JSON Web Tokens (JWT) + BCrypt | Latest | Secure session management & salted password hashing |

---

## 3. DATABASE SCHEMA HIGHLIGHTS
The database encompasses over **25+ relational models** providing full data integrity:
- `School`: Institutional profile, logo/seal storage, contact information.
- `User`: Multi-role RBAC authentication (SUPER_ADMIN, ADMIN, ACCOUNTANT, TEACHER, STUDENT, LIBRARIAN).
- `Student` & `ClassEnrollment`: Student IEMIS profiles, parent details, historical academic enrollments.
- `Teacher` & `Payroll`: Government salary scales, grade calculations, provident fund (SSK 10%), allowances, and tax withholding.
- `Attendance`: Date-wise student presence tracking and holiday configurations.
- `Exam`, `ExamSubject`, `MarkEntry`: Terminal exams, theory/practical components, grading ledger.
- `FeeHead`, `ClassFeeStructure`, `FeeCollection`: Multi-head fee rules, class rates, and receipt numbering.
- `IncomeEntry`, `ExpenseEntry`, `Party`: Government budget allocation, expense disbursement, and general journal vouchers.
- `Book` & `LibraryIssue`: Library catalog and automated overdue fine calculations.
- `InventoryItem`: Institutional asset records and physical condition logs.
- `Notice` & `PasswordResetRequest`: System broadcasts and user credential support.

---

## 4. SECURITY & DATA PRIVACY COMPLIANCE
- **Encrypted In-Transit & At-Rest**: All network traffic is encrypted over TLS 1.3 (HTTPS) with SSL database connections.
- **Proxy-Proof Action Routes**: All delete and modification operations are routed through idempotent POST/PUT endpoints to ensure cloud proxy compatibility.
- **Real-Time Cache Busters**: `Cache-Control: no-store, no-cache` headers applied across all authenticated data routes.
- **Disaster Recovery**: Automated nightly JSON snapshots plus manual one-click export/import in the School Profile module.

---

## 5. SIGN-OFF & ACCEPTANCE
The Nepal School ERP system has been audited, cleared of all temporary test data, and verified ready for production utilization.

**Delivered By:**  
Nirmala Tech Innovations  
Kathmandu, Nepal  

**Received & Accepted By:**  
School Administration / Management Committee  
Date: ________________________
