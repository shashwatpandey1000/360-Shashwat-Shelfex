'use client';

import { useRouter } from 'next/navigation';

export default function AuthErrorPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-[420px]">
        <div className="mb-4 border border-red-200 bg-red-50 p-4">
          <h2 className="text-[15px] font-semibold text-red-900">Authentication Required</h2>
          <p className="mt-1 text-[13px] text-red-700">
            You need to sign in to access this application.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="w-full cursor-pointer bg-[#131313] px-2.5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2b2b2b]"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
