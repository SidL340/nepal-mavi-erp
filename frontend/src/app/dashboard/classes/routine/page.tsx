'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClassRoutineView from '@/components/classes/ClassRoutineView';

export default function RoutineRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly redirect to unified Classes & Routine portal tab
    router.replace('/dashboard/classes?tab=routine');
  }, [router]);

  return (
    <div className="space-y-4">
      <ClassRoutineView />
    </div>
  );
}
