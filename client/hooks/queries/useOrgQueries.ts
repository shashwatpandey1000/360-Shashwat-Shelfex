import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/lib/api";

export function useOrgSettingsQuery() {
  return useQuery({
    queryKey: ["org", "settings"],
    queryFn: () => orgApi.getSettings(),
  });
}
