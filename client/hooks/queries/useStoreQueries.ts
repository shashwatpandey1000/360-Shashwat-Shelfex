import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { storesApi, StoreListParams } from "@/lib/api";

export function useStoresQuery(params?: StoreListParams) {
  return useQuery({
    queryKey: ["stores", params],
    queryFn: () => storesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useStoreByIdQuery(id: string) {
  return useQuery({
    queryKey: ["store", id],
    queryFn: () => storesApi.getById(id),
    enabled: !!id,
  });
}
