'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const isForbidden = reason === 'forbidden';

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-[420px]">
        <div
          className={`mb-4 border p-4 ${isForbidden ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}
        >
          <h2
            className={`text-[15px] font-semibold ${isForbidden ? 'text-orange-900' : 'text-red-900'}`}
          >
            {isForbidden ? 'Access Denied' : 'Authentication Required'}
          </h2>
          <p className={`mt-1 text-[13px] ${isForbidden ? 'text-orange-700' : 'text-red-700'}`}>
            {isForbidden
              ? "You don't have permission to access this page. Contact your administrator if you need access."
              : 'You need to sign in to access this application.'}
          </p>
        </div>
        <button
          onClick={() => router.push(isForbidden ? '/dashboard' : '/')}
          className="w-full cursor-pointer bg-[#131313] px-2.5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2b2b2b]"
        >
          {isForbidden ? 'Go to Dashboard' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
