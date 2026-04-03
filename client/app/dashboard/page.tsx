'use client';

import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    );
  }

  return <div className="flex h-max w-full flex-col p-6"></div>;
}

