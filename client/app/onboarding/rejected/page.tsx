'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RejectedPage() {
  const { accessMap, isLoading, needsOnboarding, logout } = useAuth();
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-red-100">
          <span className="text-2xl">✕</span>
        </div>
        <h1 className="text-xl font-semibold">Registration Not Approved</h1>
        <p className="mt-2 text-sm text-gray-500">
          Unfortunately, your organization registration was not approved.
          Please contact support for more information.
        </p>
        <button
          onClick={logout}
          className="mt-6 bg-[#131313] px-6 py-2 text-sm text-white hover:bg-[#2a2a2a] hover:underline"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
