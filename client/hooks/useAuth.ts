'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useCurrentUserQuery } from '@/hooks/queries/useAuthQueries';

async function performLogout(queryClient: ReturnType<typeof useQueryClient>) {
  // Clear 360 cookies in parallel from both servers (Express revokes the SSO
  // token server-side; Next.js route handler clears httpOnly cookies on this origin).
  await Promise.allSettled([
    authApi.logout(),
    fetch('/api/auth/logout', { method: 'POST' }),
  ]);
  queryClient.removeQueries({ queryKey: ['auth', 'me'] });

  // Navigate to the SSO logout endpoint so the SSO browser session is also
  // cleared. The SSO redirects to redirect_uri (our origin), the middleware
  // then starts a fresh OAuth flow, and the user logs in normally.
  const ssoUrl =
    process.env.NEXT_PUBLIC_SSO_API_URL || 'https://sso-self.vercel.app/api/v1';
  const returnTo = typeof window !== 'undefined' ? window.location.origin : '';
  window.location.replace(
    `${ssoUrl}/auth/logout?redirect_uri=${encodeURIComponent(returnTo)}`,
  );
}

export function useAuth() {
  const { data, isLoading, error } = useCurrentUserQuery();
  const queryClient = useQueryClient();

  // A 401 here means the stored token is invalid (wrong issuer, bad signature,
  // etc.) — not just expired (the axios interceptor already handles that via
  // refresh + retry). Clear the bad cookies server-side and send the user back
  // through SSO so they get a fresh, valid token.
  useEffect(() => {
    if ((error as any)?.response?.status === 401) {
      if (
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/auth/')
      ) {
        return;
      }
      authApi
        .logout()
        .catch(() => {})
        .finally(() => window.location.replace('/'));
    }
  }, [error]);

  const user = data?.data?.user ?? null;
  const accessMap = data?.data?.accessMap ?? null;

  const hasPermission = (permission: string) =>
    accessMap?.permissions.includes(permission) ?? false;

  const hasAnyPermission = (permissions: string[]) =>
    permissions.some((p) => accessMap?.permissions.includes(p) ?? false);

  const hasModule = (module: string) =>
    accessMap?.modules.includes(module) ?? false;

  return {
    user,
    accessMap,
    isAuthenticated: !!user,
    isLoading,
    needsOnboarding: !!user && !accessMap,
    logout: () => performLogout(queryClient),
    refreshUser: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    hasPermission,
    hasAnyPermission,
    hasModule,
  };
}
