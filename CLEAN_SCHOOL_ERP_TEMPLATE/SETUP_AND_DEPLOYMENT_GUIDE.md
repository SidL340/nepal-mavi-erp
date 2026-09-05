# 🏫 NEPAL SCHOOL ERP — COMPLETE MULTI-SCHOOL SETUP & DEPLOYMENT GUIDE

This package is a **100% clean, standalone, white-label Nepal School ERP system**.
It has **no hardcoded school names, no pre-filled demo data, and no school-specific logos**.
You can deploy this codebase for **any school, college, or educational institution** under their own custom domain and hosting!

---

## 🏗️ SYSTEM ARCHITECTURE
- **Frontend**: Next.js 16 (Turbopack, TypeScript, Tailwind CSS, TanStack React Query, Lucide Icons, Nepali Date Support)
- **Backend**: Node.js + Express REST API (Prisma ORM, JWT Authentication, Multer file upload, double-entry finance)
- **Database**: PostgreSQL (Hosted on Render, Supabase, Neon, Railway, AWS, or any VPS)

---

## 📦 FOLDER STRUCTURE IN THIS TEMPLATE
```
CLEAN_SCHOOL_ERP_TEMPLATE/
├── backend/                  # Node.js + Express + Prisma API
│   ├── prisma/
│   │   └── schema.prisma     # Complete PostgreSQL Database Schema
│   ├── scripts/
│   │   ├── generate.js       # Safe Prisma Client generator
│   │   └── setup-new-school.js # One-click initial school seed script
│   ├── src/
│   │   ├── index.js          # Express entry point
│   │   ├── routes/           # REST API routes (students, finance, payroll, exams, etc.)
│   │   ├── middleware/       # Auth & Role verification middleware
│   │   └── lib/              # Prisma client & Nepali date utilities
│   ├── package.json
│   └── .env.example          # Backend environment variables template
├── frontend/                 # Next.js 16 App Router UI
│   ├── src/
│   │   ├── app/              # Next.js App Router (Dashboard, Portals, Finance, Students, etc.)
│   │   ├── components/       # UI Components, Modals, Print Slips, Navbars
│   │   └── lib/              # API Axios instance, Nepali date converter, Zustand auth store
│   ├── package.json
│   └── .env.example          # Frontend environment variables template
└── SETUP_AND_DEPLOYMENT_GUIDE.md # Complete deployment instructions
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT INSTRUCTIONS

---

### 🔹 STEP 1: CREATE A FRESH POSTGRESQL DATABASE

You can use **any cloud PostgreSQL provider** (Free / Paid):
1. **Render.com** (Recommended):
   - Go to [render.com](https://render.com) ➔ **New +** ➔ **PostgreSQL Database**.
   - Name: `school_name_db`
   - Region: **Singapore** (lowest latency for Nepal).
   - Click **Create Database**.
   - Copy the **Database Connection URL**.
2. **Alternative Providers**:
   - **Neon.tech** (Instant serverless Postgres)
   - **Supabase.com** (Free Postgres DB)
   - **Railway.app** or a self-hosted **Ubuntu VPS (DigitalOcean / Linode / AWS)**.

---

### 🔹 STEP 2: DEPLOY THE BACKEND API

#### Deploying on Render (Web Service)
1. Push the `backend` folder to a new private GitHub repository for that school (e.g. `school-erp-backend`).
2. Go to **Render Dashboard** ➔ **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Configure settings:
   - **Runtime**: `Node`
   - **Root Directory**: Leave blank (if repo is backend only) or `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add **Environment Variables** under Environment tab:
   | Key | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?sslmode=require` | Your Postgres URL from Step 1 |
   | `JWT_SECRET` | `random_secret_32_chars_long` | Secure token key |
   | `PORT` | `5000` | Server port |
   | `NODE_ENV` | `production` | Production environment |
   | `FRONTEND_URL` | `https://app.schoolname.edu.np` | The school's frontend URL (for CORS) |
6. Click **Create Web Service**.
7. Once deployed, run Database Migration & Initial School Seed:
   - On Render, open **Shell** tab and run:
     ```bash
     npx prisma db push
     node scripts/setup-new-school.js
     ```
   - This creates all tables and provisions your initial Super Admin account!
8. Copy your live Backend URL (e.g., `https://school-erp-api.onrender.com`).

---

### 🔹 STEP 3: DEPLOY THE FRONTEND

#### Deploying on Vercel (Recommended for Next.js)
1. Push the `frontend` folder to a new private GitHub repository for that school (e.g. `school-erp-frontend`).
2. Go to [vercel.com](https://vercel.com) ➔ **Add New...** ➔ **Project**.
3. Import your GitHub repository.
4. Set **Environment Variables**:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://school-erp-api.onrender.com/api` (Your backend URL + `/api`) |
5. Click **Deploy**.
6. Deployment finishes in under ~1 minute!

#### Deploying on Render (Web Service)
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Env Variable: `NEXT_PUBLIC_API_URL=https://school-erp-api.onrender.com/api`

---

### 🔹 STEP 4: CONNECTING CUSTOM DOMAIN (e.g., `app.schoolname.edu.np`)

1. In your Domain Registrar (e.g., Nepal Telecom, Mercantile, Namecheap, Cloudflare, GoDaddy):
2. Add a **CNAME Record**:
   - **Type**: `CNAME`
   - **Name / Host**: `app` (or `portal` or `@`)
   - **Value / Target**: `cname.vercel-dns.com` (or your Render service domain)
   - **TTL**: Auto / 300
3. In Vercel / Render Dashboard ➔ **Settings** ➔ **Domains**:
   - Add `app.schoolname.edu.np`.
   - Free SSL certificates (HTTPS) are automatically issued within 2–5 minutes.

---

### 🔹 STEP 5: INITIAL SCHOOL ONBOARDING (VIA WEB UI)

1. Open your new deployment URL (e.g. `https://app.schoolname.edu.np/login`).
2. Log in with the initial Super Admin credentials:
   - **Username**: `admin@school.edu.np` (or whatever was set in `setup-new-school.js`)
   - **Password**: `#SchoolAdmin2081`
3. Go to **School Profile (विद्यालय विवरण र सेटिङ)** in the sidebar:
   - Enter Official School Name (English & Nepali).
   - Enter Address, District, Province, IEMIS Code, PAN, Phone, Email.
   - Upload the School's Official Logo & Stamp Seal (automatically updates all certificates, marksheet headers, fee receipts, and payroll slips).
4. Go to **Academic Years (शैक्षिक सत्र)**:
   - Add the current academic session (e.g. `2081-82` or `2082-83`) and toggle **ACTIVE**.
5. Go to **Classes (कक्षा र विषय)**:
   - Add classes (Class 1 to 12, Nursery, LKG, UKG, ECD) and sections.
6. Go to **Fee Heads (शुल्क शीर्षक)**:
   - Add school fee structures (Monthly Tuition, Examination, Bus, Computer, etc.).

---

## 🔒 SECURITY & DATA PRIVACY CHECKLIST FOR CLIENT DELIVERY

- [x] Change initial Super Admin password under **User Management** or **Profile Settings**.
- [x] Configure daily automated database backups under **School Profile ➔ System Backup & Restore**.
- [x] Ensure HTTPS (SSL) is enabled on both frontend and backend domains.
- [x] All data is isolated in that school's private database instance.

---

## 📞 DEVELOPER & DISTRIBUTION INFO
Developed by **Nirmala Tech Innovations**.
Every module is 100% white-label, modular, and ready for instant commercial deployment to any school in Nepal!
