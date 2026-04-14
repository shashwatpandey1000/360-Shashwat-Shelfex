'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingApprovalPage() {
  const { accessMap, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (accessMap?.orgStatus === 'active') {
      router.replace('/dashboard');
    }
  }, [isLoading, needsOnboarding, accessMap, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md border bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-yellow-100">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-xl font-semibold">Registration Under Review</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your organization has been submitted for approval. We&apos;ll notify you
          once it&apos;s reviewed. This usually takes less than 24 hours.
        </p>
      </div>
    </div>
  );
}
