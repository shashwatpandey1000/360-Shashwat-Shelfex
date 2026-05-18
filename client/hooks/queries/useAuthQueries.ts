// client/hooks/queries/useAuthQueries.ts
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — avoids re-fetching on every mount
  });
}
