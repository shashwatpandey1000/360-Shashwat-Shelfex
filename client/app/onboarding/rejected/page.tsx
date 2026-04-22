'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomButton } from '@/components/common/button';
import { UserAvatar } from '@/components/common/user-avatar';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { VerticalStepRail } from '../components/StepRail';

export default function RejectedPage() {
  const { user, accessMap, isLoading, needsOnboarding, logout } = useAuth();
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
              <div className="inline-flex items-center gap-2 border border-red-200 bg-red-50 px-2.5 py-1 dark:border-red-900 dark:bg-red-950">
                <span className="h-1.5 w-1.5 bg-red-600 dark:bg-red-400" />
                <span className="text-[11px] font-medium tracking-[0.12em] text-red-700 uppercase dark:text-red-300">
                  Not approved
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#131313] dark:text-white">
                Registration not approved
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Our team has reviewed your submission and was unable to approve it at this time.
              </p>
            </header>

            <div className="border border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-4 border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-[#131313]">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#131313] bg-[#131313] dark:border-white dark:bg-white">
                  <X className="h-4 w-4 text-white dark:text-[#131313]" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#131313] dark:text-white">
                    Access denied
                  </p>
                  <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                    Please contact support for details on this decision, or to provide additional
                    information for re-review.
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-gray-200 dark:divide-gray-800">
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">Rejected</dd>
                </div>
                {accessMap?.orgRejectedAt && (
                  <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                    <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                      Rejected on
                    </dt>
                    <dd className="text-[13px] text-[#131313] dark:text-white">
                      {new Date(accessMap.orgRejectedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
                {accessMap?.orgRejectionReason && (
                  <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                    <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                      Reason
                    </dt>
                    <dd className="text-[13px] text-[#131313] dark:text-white">
                      {accessMap.orgRejectionReason}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Account
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">{user?.email}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] px-6 py-3">
                  <dt className="text-[12px] tracking-[0.08em] text-gray-500 uppercase dark:text-gray-400">
                    Support
                  </dt>
                  <dd className="text-[13px] text-[#131313] dark:text-white">
                    support@shelfexecution.com
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-gray-200 px-8 dark:border-gray-800">
        <a
          href="mailto:support@shelfexecution.com"
          className="text-sm text-gray-500 hover:text-[#131313] hover:underline dark:text-gray-400 dark:hover:text-white"
        >
          Contact support
        </a>
        <CustomButton onClick={logout}>Sign out</CustomButton>
      </footer>
    </div>
  );
}
