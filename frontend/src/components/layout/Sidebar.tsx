'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  LayoutDashboard,
  Users,
  School,
  CalendarCheck,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  GraduationCap,
  Library,
  Package,
  Bell,
  Settings,
  Globe,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserCog,
  KeyRound,
  FileText,
  Layers,
  Clock,
  Grid,
  Mail,
  UserCheck,
  Scale,
} from 'lucide-react';
import { useState, useEffect } from 'react';


// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  nepaliLabel: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavSection {
  section: string;
  nepaliSection: string;
  roles: string[];
  items: NavItem[];
}

// ─── Navigation Config ────────────────────────────────────────────────────────

const navConfig: (NavItem | NavSection)[] = [
  // ── 1. GLOBAL ROOT DASHBOARD LINKS (Role specific) ──
  {
    label: 'Dashboard',
    nepaliLabel: 'ड्यासबोर्ड',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    label: 'Teacher Dashboard',
    nepaliLabel: 'शिक्षक ड्यासबोर्ड',
    href: '/teacher',
    icon: LayoutDashboard,
    roles: ['TEACHER'],
  },
  {
    label: 'Student Dashboard',
    nepaliLabel: 'विद्यार्थी ड्यासबोर्ड',
    href: '/student',
    icon: LayoutDashboard,
    roles: ['STUDENT'],
  },
  {
    label: 'Finance Hub',
    nepaliLabel: 'लेखा ड्यासबोर्ड',
    href: '/dashboard/finance',
    icon: LayoutDashboard,
    roles: ['ACCOUNTANT'],
  },
  {
    label: 'Library Desk',
    nepaliLabel: 'पुस्तकालय ड्यासबोर्ड',
    href: '/dashboard/library',
    icon: LayoutDashboard,
    roles: ['LIBRARIAN'],
  },

  // ── 2. ADMIN ACADEMIC MANAGEMENT ──
  {
    section: 'ACADEMIC MANAGEMENT',
    nepaliSection: 'शैक्षिक व्यवस्थापन',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Students', nepaliLabel: 'विद्यार्थीहरू', href: '/dashboard/students', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Teachers & Staff', nepaliLabel: 'शिक्षक तथा कर्मचारी', href: '/dashboard/teachers', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Classes & Routine', nepaliLabel: 'कक्षा तथा रुटिन', href: '/dashboard/classes', icon: School, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Daily Teaching Logs', nepaliLabel: 'दैनिक शिक्षण लग', href: '/dashboard/teaching-logs', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Daily Attendance', nepaliLabel: 'दैनिक हाजिरी', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Exams & Marks', nepaliLabel: 'परीक्षा तथा लब्धाङ्क', href: '/dashboard/exams', icon: Award, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Seat Planning', nepaliLabel: 'परीक्षा सिट योजना', href: '/dashboard/exams/seat-planning', icon: Grid, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Certificates (CC/TC)', nepaliLabel: 'प्रमाणपत्र व्यवस्थापन', href: '/dashboard/certificates', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },

  // ── 3. ADMIN FINANCIAL MANAGEMENT ──
  {
    section: 'FINANCIAL MANAGEMENT',
    nepaliSection: 'आर्थिक व्यवस्थापन',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Finance Portal Hub', nepaliLabel: 'वित्तीय हब पोर्टल', href: '/dashboard/finance', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Fee Collection', nepaliLabel: 'शुल्क संकलन', href: '/dashboard/finance/fees', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Income & Grants', nepaliLabel: 'आम्दानी तथा अनुदान', href: '/dashboard/finance/income', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Expenses Entry', nepaliLabel: 'खर्च प्रविष्टि', href: '/dashboard/finance/expenses', icon: TrendingDown, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Staff Payroll', nepaliLabel: 'शिक्षक कर्मचारी तलब', href: '/dashboard/finance/payroll', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Budget & Variance', nepaliLabel: 'बजेट विनियोजन', href: '/dashboard/finance/budget', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Journal Vouchers', nepaliLabel: 'गोश्वारा भौचर', href: '/dashboard/finance/journal', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Financial Reports', nepaliLabel: 'वित्तीय प्रतिवेदन', href: '/dashboard/finance/reports', icon: Scale, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Account Masters & Heads', nepaliLabel: 'शीर्षक व्यवस्थापन', href: '/dashboard/finance/heads', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },

  // ── 4. ADMIN SERVICES & ADMINISTRATION ──
  {
    section: 'SERVICES & ADMINISTRATION',
    nepaliSection: 'प्रशासन तथा सेवाहरू',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Leave Management', nepaliLabel: 'बिदा व्यवस्थापन', href: '/dashboard/leaves', icon: UserCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Official Letters', nepaliLabel: 'लेटरप्याड र चलानी', href: '/dashboard/letters', icon: Mail, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Library Management', nepaliLabel: 'पुस्तकालय व्यवस्थापन', href: '/dashboard/library', icon: Library, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Inventory (Jinsi)', nepaliLabel: 'जिन्सी खाता', href: '/dashboard/inventory', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Notices & SMS', nepaliLabel: 'सूचना / SMS प्रसारण', href: '/dashboard/notices', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'User Accounts', nepaliLabel: 'प्रयोगकर्ता व्यवस्थापन', href: '/dashboard/users', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'App Usage & Logins', nepaliLabel: 'प्रयोग अनुगमन तथा सक्रिय लग', href: '/dashboard/usage-tracking', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'School Profile', nepaliLabel: 'विद्यालय प्रोफाइल', href: '/dashboard/school', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Public Website', nepaliLabel: 'मुख्य वेभसाइट', href: '/dashboard/website', icon: Globe, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },

  // ── 5. TEACHER PORTAL SECTIONS ──
  {
    section: 'CLASSROOM & TEACHING',
    nepaliSection: 'दैनिक कक्षा तथा शिक्षण',
    roles: ['TEACHER'],
    items: [
      { label: 'Daily Teaching Log', nepaliLabel: 'दैनिक शिक्षण डायरी', href: '/teacher?tab=daily_log', icon: BookOpen, roles: ['TEACHER'] },
      { label: 'Class Attendance', nepaliLabel: 'कक्षा हाजिरी', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['TEACHER'] },
      { label: 'Class Routine', nepaliLabel: 'साप्ताहिक रुटिन', href: '/teacher?tab=routine', icon: Clock, roles: ['TEACHER'] },
      { label: 'Exams & Marks', nepaliLabel: 'परीक्षा तथा लब्धाङ्क', href: '/dashboard/exams', icon: Award, roles: ['TEACHER'] },
      { label: 'Student Leave Requests', nepaliLabel: 'विद्यार्थी बिदा सिफारिस', href: '/teacher?tab=students_leave', icon: FileText, roles: ['TEACHER'] },
    ],
  },
  {
    section: 'MY PORTAL & DUTIES',
    nepaliSection: 'मेरो विवरण तथा जिम्मेवारी',
    roles: ['TEACHER'],
    items: [
      { label: 'Assigned Duties & Tasks', nepaliLabel: 'तोकिएका जिम्मेवारीहरू', href: '/teacher?tab=tasks', icon: Layers, roles: ['TEACHER'] },
      { label: 'My Leave Requests', nepaliLabel: 'मेरो बिदा निवेदन', href: '/teacher?tab=leaves', icon: UserCheck, roles: ['TEACHER'] },
      { label: 'School Notices', nepaliLabel: 'सूचना तथा क्यालेन्डर', href: '/teacher?tab=notices', icon: Bell, roles: ['TEACHER'] },
    ],
  },

  // ── 6. STUDENT PORTAL SECTIONS ──
  {
    section: 'MY ACADEMICS',
    nepaliSection: 'मेरो पढाइ तथा परीक्षा',
    roles: ['STUDENT'],
    items: [
      { label: 'Today\'s Lessons & HW', nepaliLabel: 'दैनिक पढाइ र गृहकार्य', href: '/student?tab=lessons', icon: BookOpen, roles: ['STUDENT'] },
      { label: 'Class Routine', nepaliLabel: 'कक्षा रुटिन', href: '/student?tab=routine', icon: Clock, roles: ['STUDENT'] },
      { label: 'My Attendance', nepaliLabel: 'हाजिरी विवरण', href: '/student?tab=attendance', icon: CalendarCheck, roles: ['STUDENT'] },
      { label: 'Marksheets & Grades', nepaliLabel: 'लब्धाङ्क पत्र / ग्रेडसिट', href: '/student?tab=exams', icon: Award, roles: ['STUDENT'] },
      { label: 'Homework & Tasks', nepaliLabel: 'गृहकार्य तथा अभ्यास', href: '/student?tab=homework', icon: FileText, roles: ['STUDENT'] },
    ],
  },
  {
    section: 'SERVICES & ID',
    nepaliSection: 'सेवा तथा परिचय',
    roles: ['STUDENT'],
    items: [
      { label: 'Fee Receipts', nepaliLabel: 'शुल्क विवरण र रसिद', href: '/student?tab=fees', icon: Receipt, roles: ['STUDENT'] },
      { label: 'Library Books', nepaliLabel: 'पुस्तकालय', href: '/student?tab=library', icon: Library, roles: ['STUDENT'] },
      { label: 'Apply for Leave', nepaliLabel: 'बिदा निवेदन', href: '/student?tab=leave', icon: UserCheck, roles: ['STUDENT'] },
      { label: 'Notice Board', nepaliLabel: 'सूचना पाटी', href: '/student?tab=notices', icon: Bell, roles: ['STUDENT'] },
      { label: 'Digital ID Card', nepaliLabel: 'परिचय पत्र', href: '/student?tab=idcard', icon: GraduationCap, roles: ['STUDENT'] },
    ],
  },

  // ── 7. ACCOUNTANT PORTAL SECTIONS ──
  {
    section: 'BILLING & FEES',
    nepaliSection: 'शुल्क तथा आम्दानी',
    roles: ['ACCOUNTANT'],
    items: [
      { label: 'Fee Collection', nepaliLabel: 'विद्यार्थी शुल्क संकलन', href: '/dashboard/finance/fees', icon: Receipt, roles: ['ACCOUNTANT'] },
      { label: 'Student Accounts', nepaliLabel: 'विद्यार्थी लेजर', href: '/dashboard/students', icon: Users, roles: ['ACCOUNTANT'] },
      { label: 'Income & Grants', nepaliLabel: 'आम्दानी तथा अनुदान', href: '/dashboard/finance/income', icon: TrendingUp, roles: ['ACCOUNTANT'] },
    ],
  },
  {
    section: 'EXPENSES & ACCOUNTS',
    nepaliSection: 'खर्च तथा लेखा',
    roles: ['ACCOUNTANT'],
    items: [
      { label: 'Expense Vouchers', nepaliLabel: 'खर्च प्रविष्टि', href: '/dashboard/finance/expenses', icon: TrendingDown, roles: ['ACCOUNTANT'] },
      { label: 'Staff Payroll', nepaliLabel: 'तलब भत्ता', href: '/dashboard/finance/payroll', icon: Wallet, roles: ['ACCOUNTANT'] },
      { label: 'Budget Allocation', nepaliLabel: 'बजेट विनियोजन', href: '/dashboard/finance/budget', icon: Layers, roles: ['ACCOUNTANT'] },
      { label: 'Journal Vouchers', nepaliLabel: 'गोश्वारा भौचर', href: '/dashboard/finance/journal', icon: FileText, roles: ['ACCOUNTANT'] },
      { label: 'Financial Reports', nepaliLabel: 'वित्तीय प्रतिवेदन', href: '/dashboard/finance/reports', icon: Scale, roles: ['ACCOUNTANT'] },
      { label: 'Account Heads', nepaliLabel: 'शीर्षक व्यवस्थापन', href: '/dashboard/finance/heads', icon: Layers, roles: ['ACCOUNTANT'] },
    ],
  },
  {
    section: 'OPERATIONS',
    nepaliSection: 'सञ्चालन तथा सेवा',
    roles: ['ACCOUNTANT'],
    items: [
      { label: 'Inventory (Jinsi)', nepaliLabel: 'जिन्सी खाता', href: '/dashboard/inventory', icon: Package, roles: ['ACCOUNTANT'] },
      { label: 'Leave Management', nepaliLabel: 'बिदा व्यवस्थापन', href: '/dashboard/leaves', icon: UserCheck, roles: ['ACCOUNTANT'] },
      { label: 'Official Letters', nepaliLabel: 'लेटरप्याड र चलानी', href: '/dashboard/letters', icon: Mail, roles: ['ACCOUNTANT'] },
      { label: 'Notices', nepaliLabel: 'सूचनाहरू', href: '/dashboard/notices', icon: Bell, roles: ['ACCOUNTANT'] },
    ],
  },

  // ── 8. LIBRARIAN PORTAL SECTIONS ──
  {
    section: 'LIBRARY CIRCULATION',
    nepaliSection: 'पुस्तकालय सेवा',
    roles: ['LIBRARIAN'],
    items: [
      { label: 'Book Catalog', nepaliLabel: 'पुस्तक सूची', href: '/dashboard/library?tab=books', icon: BookOpen, roles: ['LIBRARIAN'] },
      { label: 'Issue & Returns', nepaliLabel: 'पुस्तक जारी तथा फिर्ता', href: '/dashboard/library?tab=issues', icon: Library, roles: ['LIBRARIAN'] },
      { label: 'Overdue & Fines', nepaliLabel: 'म्याद नाघेका पुस्तक', href: '/dashboard/library?tab=overdue', icon: Clock, roles: ['LIBRARIAN'] },
      { label: 'School Notices', nepaliLabel: 'सूचनाहरू', href: '/dashboard/notices', icon: Bell, roles: ['LIBRARIAN'] },
    ],
  },
];

function getRoleHref(href: string, role?: string): string {
  if (href === '/dashboard') {
    if (role === 'TEACHER') return '/teacher';
    if (role === 'STUDENT') return '/student';
    if (role === 'ACCOUNTANT') return '/dashboard/finance';
    if (role === 'LIBRARIAN') return '/dashboard/library';
  }
  return href;
}

function isActive(href: string, pathname: string, role?: string): boolean {
  const target = getRoleHref(href, role);
  if (target === '/dashboard' || target === '/teacher' || target === '/student') {
    return pathname === target;
  }
  if (target.includes('?')) {
    const basePath = target.split('?')[0];
    return pathname === basePath;
  }
  return pathname === target || pathname.startsWith(target + '/');
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  role?: string;
  onNavigate?: () => void;
}

function NavLink({ item, pathname, collapsed, onNavigate, role }: NavLinkProps) {
  const targetHref = getRoleHref(item.href, role);
  const active = isActive(item.href, pathname, role);
  const Icon = item.icon;

  return (
    <Link
      href={targetHref}
      onClick={onNavigate}
      title={collapsed ? `${item.label} (${item.nepaliLabel})` : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
        active
          ? 'bg-amber-400 text-[#1e3a5f] shadow-sm font-bold'
          : 'text-slate-200 hover:bg-[#284c78] hover:text-white',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon
        size={18}
        className={cn(
          'shrink-0',
          active ? 'text-[#1e3a5f]' : 'text-slate-300 group-hover:text-white'
        )}
      />
      {!collapsed && (
        <div className="flex flex-col truncate">
          <span className="truncate">{item.label}</span>
          <span className="text-[10px] font-normal opacity-75 font-nepali">{item.nepaliLabel}</span>
        </div>
      )}
    </Link>
  );
}

function NavTree({
  role,
  pathname,
  collapsed,
  onNavigate,
}: {
  role: string;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const userRole = role?.toUpperCase() || '';

  return (
    <ul className="space-y-1">
      {navConfig.map((entry, idx) => {
        if ('href' in entry) {
          if (!entry.roles.includes(userRole)) return null;
          return (
            <li key={entry.href}>
              <NavLink item={entry} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} role={userRole} />
            </li>
          );
        }

        const section = entry as NavSection;
        if (!section.roles.includes(userRole)) return null;
        const visibleItems = section.items.filter((it) => it.roles.includes(userRole));
        if (visibleItems.length === 0) return null;

        return (
          <li key={idx} className="pt-2">
            {!collapsed ? (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.section}
              </p>
            ) : (
              <div className="mx-auto my-2 h-px w-6 bg-[#2a4f7c]" />
            )}
            <ul className="space-y-0.5">
              {visibleItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    onMobileClose();
  }, [pathname]);

  const role = user?.role || '';
  const displayName =
    user?.teacher?.fullName || user?.student?.fullName || user?.username || 'User';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex md:shrink-0 md:flex-col bg-[#1e3a5f] transition-all duration-200 border-r border-[#264b75]',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo Header */}
        <div
          className={cn(
            'flex items-center border-b border-[#2a4f7c] px-4 py-4',
            collapsed ? 'justify-center px-2' : 'gap-3'
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-2 ring-amber-400/40">
            <img src="/school_logo.png" alt="School Emblem Seal" className="w-9 h-9 object-contain rounded-full" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white tracking-wide">NEPAL MAVI ERP</p>
              <p className="truncate text-[10px] font-medium text-amber-400 font-nepali">नेपाल मा.वि.</p>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavTree role={role} pathname={pathname} collapsed={collapsed} />
        </nav>

        {/* Footer info & collapse toggle */}
        <div className="border-t border-[#2a4f7c] p-2 bg-[#172e4c]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mb-1.5 hidden w-full items-center justify-center rounded-lg py-1.5 text-slate-400 transition hover:bg-[#2a4f7c] hover:text-white md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <ChevronLeft size={16} />
                Collapse
              </span>
            )}
          </button>

          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg p-2',
              collapsed && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#1e3a5f] shadow-sm">
              {initials || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{displayName}</p>
                <p className="truncate text-[10px] uppercase font-semibold text-amber-300/80">{role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
          {!collapsed && (
            <div className="mt-1 pt-1.5 border-t border-[#264b75] text-[9px] text-center text-slate-300">
              Developed by <strong className="text-amber-300 font-bold">Nirmala Tech Innovations</strong>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile overlay + drawer ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#1e3a5f] shadow-2xl z-50">
            <div className="flex items-center justify-between border-b border-[#2a4f7c] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-2 ring-amber-400/40">
                  <img src="/school_logo.png" alt="School Emblem Seal" className="w-9 h-9 object-contain rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">NEPAL MAVI ERP</p>
                  <p className="text-[10px] font-medium text-amber-400 font-nepali">नेपाल मा.वि.</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-[#2a4f7c] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <NavTree
                role={role}
                pathname={pathname}
                collapsed={false}
                onNavigate={onMobileClose}
              />
            </nav>

            <div className="border-t border-[#2a4f7c] p-3 bg-[#172e4c]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#1e3a5f]">
                  {initials || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{displayName}</p>
                  <p className="truncate text-[10px] uppercase font-semibold text-amber-300/80">{role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
