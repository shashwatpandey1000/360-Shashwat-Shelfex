"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';

export function useLoginCallbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      state,
      pkceVerifier,
    }: {
      code: string;
      state: string | null;
      pkceVerifier: string | null | undefined;
    }) => authApi.callback(code, state, pkceVerifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      const ssoUrl =
        process.env.NEXT_PUBLIC_SSO_API_URL || 'http://localhost:8000/api/v1';
      window.location.href = `${ssoUrl}/auth/logout?redirect_uri=${encodeURIComponent(window.location.origin)}`;
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });
}
