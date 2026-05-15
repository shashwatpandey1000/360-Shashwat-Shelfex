"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/lib/api";

export function useRegisterOrgMutation() {
  return useMutation({
    mutationFn: (data: Parameters<typeof orgApi.register>[0]) => orgApi.register(data),
  });
}

export function useUpdateOrgSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => orgApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "settings"] });
    },
  });
}
