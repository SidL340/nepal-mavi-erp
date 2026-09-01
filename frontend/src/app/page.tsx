'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const roleRoutes: Record<string, string> = {
          SUPER_ADMIN: '/dashboard',
          ADMIN: '/dashboard',
          ACCOUNTANT: '/dashboard/finance',
          TEACHER: '/teacher',
          LIBRARIAN: '/dashboard/library',
          STUDENT: '/student',
        };
        router.replace(roleRoutes[user.role] || '/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-medium">Loading Nepal School ERP...</p>
      </div>
    </div>
  );
}
