import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toursApi } from "./api";

export function useToursQuery(params?: {
  storeId?: string;
  status?: string;
  page?: number;
  perPage?: number;
}) {
  return useQuery({
    queryKey: ["tours", params],
    queryFn: () => toursApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTourByIdQuery(id: string) {
  return useQuery({
    queryKey: ["tour", id],
    queryFn: () => toursApi.getById(id),
    enabled: !!id,
  });
}

export function useActiveStoreTourQuery(storeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tour", "active", storeId],
    queryFn: () => toursApi.getActiveForStore(storeId),
    enabled: !!storeId && (options?.enabled ?? true),
  });
}
