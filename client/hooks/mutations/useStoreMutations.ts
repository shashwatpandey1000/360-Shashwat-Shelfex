"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storesApi, CreateStoreData } from "@/lib/api";

export function useCreateStoreMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStoreData) => storesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useUpdateStoreMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStoreData> }) =>
      storesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useDeactivateStoreMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storesApi.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useBulkImportStoresMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => storesApi.bulkImport(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}
