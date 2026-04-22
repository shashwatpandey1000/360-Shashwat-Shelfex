'use client';

import ComingSoon from '@/components/common/ComingSoon';
import { useAuth } from '@/contexts/auth-context';
import { storesApi } from '@/lib/api/stores.api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, accessMap, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();
  const [isCheckingStoreBootstrap, setIsCheckingStoreBootstrap] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkStoreBootstrap = async () => {
      // Only run for active users that can read stores.
      if (accessMap?.orgStatus !== 'active') {
        if (!cancelled) setIsCheckingStoreBootstrap(false);
        return;
      }

      if (!accessMap.permissions.includes('stores:read')) {
        if (!cancelled) setIsCheckingStoreBootstrap(false);
        return;
      }

      try {
        const response = await storesApi.list({ page: 1, perPage: 1 });
        const totalStores =
          response?.data?.total ??
          response?.data?.pagination?.total ??
          response?.data?.meta?.total ??
          response?.data?.data?.length ??
          response?.pagination?.total ??
          response?.meta?.total ??
          response?.total ??
          (Array.isArray(response?.data) ? response.data.length : undefined);

        if (!cancelled && totalStores === 0) {
          router.replace('/dashboard/stores');
          return;
        }
      } catch {
        // Keep users on dashboard if bootstrap check fails.
      } finally {
        if (!cancelled) setIsCheckingStoreBootstrap(false);
      }
    };

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

    // Bootstrap redirect should run only once on DB-marked first login.
    if (!user?.firstLogin) {
      setIsCheckingStoreBootstrap(false);
      return;
    }

    setIsCheckingStoreBootstrap(true);
    void checkStoreBootstrap();

    return () => {
      cancelled = true;
    };
  }, [isLoading, needsOnboarding, accessMap, user, router]);

  if (
    isLoading ||
    needsOnboarding ||
    accessMap?.orgStatus !== 'active' ||
    isCheckingStoreBootstrap
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    );
  }

  return <ComingSoon feature="Dashboard" />;
}
