'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Read PKCE verifier from cookie (set by middleware) and send to server
        const pkceVerifier = document.cookie
          .split('; ')
          .find((c) => c.startsWith('pkce_verifier='))
          ?.split('=')[1];

        // Clear the one-time PKCE verifier cookie
        document.cookie = 'pkce_verifier=; path=/; max-age=0';

        await authApi.callback(code, state, pkceVerifier);

        // Full reload so AuthProvider re-fetches with the new cookies
        window.location.href = '/dashboard';
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.response?.data?.message || err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-[420px]">
          <div className="mb-4 border border-red-200 bg-red-50 p-4">
            <h2 className="text-[15px] font-semibold text-red-900">Authentication Error</h2>
            <p className="mt-1 text-[13px] text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full cursor-pointer bg-[#131313] px-2.5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2b2b2b]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
