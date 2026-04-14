'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { accessMap, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // No 360 org → onboarding
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Org exists but not yet approved
    if (accessMap?.orgStatus === 'pending_approval') {
      router.replace('/onboarding/pending');
      return;
    }

    // Org was rejected
    if (accessMap?.orgStatus === 'rejected') {
      router.replace('/onboarding/rejected');
      return;
    }
  }, [isLoading, needsOnboarding, accessMap, router]);

  if (isLoading || needsOnboarding || accessMap?.orgStatus !== 'active') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    );
  }

  return <div className="flex h-max w-full flex-col p-6"></div>;
}

