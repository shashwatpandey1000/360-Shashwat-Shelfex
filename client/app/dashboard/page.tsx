'use client';

import ComingSoon from '@/components/common/ComingSoon';
import { useAuth } from '@/hooks/useAuth';
import { useStoresQuery } from '@/features/stores';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, accessMap, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();

  const storesBootstrapQuery = useStoresQuery({ page: 1, perPage: 1 });
  const isCheckingStoreBootstrap =
    !isLoading &&
    !needsOnboarding &&
    accessMap?.orgStatus === 'active' &&
    !!user?.firstLogin &&
    storesBootstrapQuery.isLoading;

  useEffect(() => {
    if (isLoading) return;
    if (needsOnboarding) { router.replace('/onboarding'); return; }
    if (accessMap?.orgStatus === 'pending_approval') { router.replace('/onboarding/pending'); return; }
    if (accessMap?.orgStatus === 'rejected') { router.replace('/onboarding/rejected'); return; }

    if (!user?.firstLogin) return;
    if (!accessMap?.permissions?.includes('stores:read')) return;
    if (storesBootstrapQuery.isLoading) return;

    const totalStores = storesBootstrapQuery.data?.data?.total ?? 0;
    if (totalStores === 0) {
      router.replace('/dashboard/stores');
    }
  }, [isLoading, needsOnboarding, accessMap, user, router, storesBootstrapQuery.isLoading, storesBootstrapQuery.data]);

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
