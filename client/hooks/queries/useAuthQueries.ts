import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
  });
}
