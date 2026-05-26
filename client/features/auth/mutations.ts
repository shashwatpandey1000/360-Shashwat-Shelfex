"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';

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
  return useMutation({
    mutationFn: () => authApi.logout(),
  });
}
