'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useCurrentUserQuery } from '@/hooks/queries/useAuthQueries';
import { useLogoutMutation } from '@/hooks/mutations/useAuthMutations';

export function useAuth() {
  const { data, isLoading, error } = useCurrentUserQuery();
  const queryClient = useQueryClient();
  const { mutateAsync: logoutMutate } = useLogoutMutation();

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
    logout: () => logoutMutate(),
    refreshUser: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    hasPermission,
    hasAnyPermission,
    hasModule,
  };
}
