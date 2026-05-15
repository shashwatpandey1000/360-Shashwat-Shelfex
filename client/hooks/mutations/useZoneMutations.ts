"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zonesApi, CreateZoneData } from "@/lib/api";

export function useCreateZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateZoneData) => zonesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}

export function useUpdateZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateZoneData> }) =>
      zonesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["zone", id] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}

export function useDeleteZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => zonesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
  });
}
