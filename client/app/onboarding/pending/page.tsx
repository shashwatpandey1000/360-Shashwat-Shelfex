'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { UserAvatar } from '@/components/common/user-avatar';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { VerticalStepRail } from '../components/StepRail';

export default function PendingApprovalPage() {
  const { user, accessMap, isLoading, needsOnboarding } = useAuth();
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
    <div className="flex h-screen w-full flex-col bg-white dark:bg-[#0a0a0a]">
      <header className="fixed top-0 left-0 z-50 flex h-14 w-full shrink-0 items-stretch justify-between bg-white px-6 dark:bg-[#0a0a0a]">
        <div className="flex items-center">
          <span className="text-sm font-semibold tracking-[0.2em] text-[#131313] dark:text-white">
            LOGO
          </span>
        </div>
        <div className="flex items-stretch">
          <ThemeToggle />
          <UserAvatar />
        </div>
      </header>

      <div className="relative flex flex-1 overflow-y-auto">
        <div className="absolute top-0 bottom-0 left-0 hidden w-64 items-center justify-center lg:flex">
          <VerticalStepRail currentStep="review" />
        </div>

        <div className="flex-1 overflow-y-auto pt-18 pb-10">
          <div className="mx-auto max-w-2xl px-8 py-10">
            <header className="mb-10 border-b border-gray-200 pb-6 dark:border-gray-800">
              <div className="inline-flex items-center gap-2 border border-gray-200 bg-white px-2.5 py-1 dark:border-gray-800 dark:bg-[#131313]">
                <span className="h-1.5 w-1.5 bg-[#131313] dark:bg-white" />
                <span className="text-[11px] font-medium tracking-[0.12em] text-[#131313] uppercase dark:text-white">
                  Step 2 of 3
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#131313] dark:text-white">
                Registration under review
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                We&apos;ve received your submission and our team is verifying the details.
              </p>
            </header>

            <div className="border border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-4 border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-[#131313]">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-gray-300 bg-white dark:border-gray-700 dark:bg-[#0a0a0a]">
                  <Clock className="h-4 w-4 text-[#131313] dark:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#131313] dark:text-white">
                    Awaiting approval
                  </p>
                  <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                    Review usually completes within 24 hours. You&apos;ll receive an email at{' '}
                    <span className="text-[#131313] dark:text-white">{user?.email}</span> once a
                    decision is made.
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-gray-200 dark:divide-gray-800">
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">Pending approval</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Submitted
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">Just now</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Next step
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">
                    Email notification on decision
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
