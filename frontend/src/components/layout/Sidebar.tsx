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
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserCog,
  KeyRound,
  FileText,
  Layers,
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
  {
    label: 'Dashboard',
    nepaliLabel: 'ड्यासबोर्ड',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'LIBRARIAN', 'STUDENT'],
  },
  {
    section: 'STUDENTS',
    nepaliSection: 'विद्यार्थी',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'ACCOUNTANT'],
    items: [
      { label: 'Students', nepaliLabel: 'विद्यार्थीहरू', href: '/dashboard/students', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Classes', nepaliLabel: 'कक्षा र विषय', href: '/dashboard/classes', icon: School, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Attendance', nepaliLabel: 'हाजिरी', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Exams & Marks', nepaliLabel: 'परीक्षा र लब्धाङ्क', href: '/dashboard/exams', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
      { label: 'Certificates', nepaliLabel: 'प्रमाणपत्र (CC/TC)', href: '/dashboard/certificates', icon: Award, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    section: 'FINANCE & PAYROLL',
    nepaliSection: 'आर्थिक तथा तलब',
    roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
    items: [
      { label: 'Income / Budget', nepaliLabel: 'आम्दानी / बजेट', href: '/dashboard/finance/income', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Expenses', nepaliLabel: 'खर्च', href: '/dashboard/finance/expenses', icon: TrendingDown, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Fee Collection', nepaliLabel: 'शुल्क संकलन', href: '/dashboard/finance/fees', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Teacher Payroll', nepaliLabel: 'शिक्षक तलब भत्ता', href: '/dashboard/finance/payroll', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Journal Vouchers', nepaliLabel: 'गोश्वारा भौचर', href: '/dashboard/finance/journal', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Masters & Heads', nepaliLabel: 'शीर्षक व्यवस्थापन', href: '/dashboard/finance/heads', icon: Layers, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
    ],
  },
  {
    section: 'STAFF',
    nepaliSection: 'शिक्षक तथा कर्मचारी',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Teachers', nepaliLabel: 'शिक्षक विवरण', href: '/dashboard/teachers', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    section: 'SERVICES',
    nepaliSection: 'सेवा तथा प्रशासन',
    roles: ['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'TEACHER', 'ACCOUNTANT'],
    items: [
      { label: 'Library', nepaliLabel: 'पुस्तकालय', href: '/dashboard/library', icon: Library, roles: ['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN'] },
      { label: 'Inventory (Jinsi)', nepaliLabel: 'जिन्सी खाता', href: '/dashboard/inventory', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
      { label: 'Notices & SMS', nepaliLabel: 'सूचना / SMS', href: '/dashboard/notices', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'ACCOUNTANT'] },
      { label: 'User Management', nepaliLabel: 'प्रयोगकर्ता व्यवस्थापन', href: '/dashboard/users', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'School Profile', nepaliLabel: 'विद्यालय प्रोफाइल', href: '/dashboard/school', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    section: 'STUDENT PORTAL',
    nepaliSection: 'विद्यार्थी पोर्टल',
    roles: ['STUDENT'],
    items: [
      { label: 'Overview', nepaliLabel: 'ड्यासबोर्ड', href: '/student', icon: LayoutDashboard, roles: ['STUDENT'] },
      { label: 'My Attendance', nepaliLabel: 'हाजिरी विवरण', href: '/student?tab=attendance', icon: CalendarCheck, roles: ['STUDENT'] },
      { label: 'Marksheets & Grades', nepaliLabel: 'लब्धाङ्क पत्र / ग्रेडसिट', href: '/student?tab=exams', icon: BookOpen, roles: ['STUDENT'] },
      { label: 'Fee Receipts', nepaliLabel: 'शुल्क विवरण', href: '/student?tab=fees', icon: Receipt, roles: ['STUDENT'] },
      { label: 'Library Books', nepaliLabel: 'पुस्तकालय', href: '/student?tab=library', icon: Library, roles: ['STUDENT'] },
      { label: 'Notice Board', nepaliLabel: 'सूचना पाटी', href: '/student?tab=notices', icon: Bell, roles: ['STUDENT'] },
      { label: 'Student ID Card', nepaliLabel: 'परिचय पत्र', href: '/student?tab=idcard', icon: Award, roles: ['STUDENT'] },
    ],
  },
];

function getRoleHref(href: string, role?: string): string {
  if (href === '/dashboard') {
    if (role === 'TEACHER') return '/teacher';
    if (role === 'STUDENT') return '/student';
  }
  return href;
}

function isActive(href: string, pathname: string, role?: string): boolean {
  const target = getRoleHref(href, role);
  if (target === '/dashboard' || target === '/teacher' || target === '/student') {
    return pathname === target;
  }
  if (target.startsWith('/student?tab=')) {
    return pathname === '/student';
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#1e3a5f] shadow-md">
            <Building2 size={22} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white tracking-wide">NEPAL SSB ERP</p>
              <p className="truncate text-[10px] font-medium text-amber-400 font-nepali">नेपाल एसएसबी मा.वि.</p>
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-[#1e3a5f]">
                  <Building2 size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">NEPAL MAVI ERP</p>
                  <p className="text-[10px] text-amber-400 font-nepali">विद्यालय व्यवस्थापन प्रणाली</p>
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
