import { useQuery } from "@tanstack/react-query";
import { lookupsApi } from "./api";

export function useIndustriesQuery() {
  return useQuery({
    queryKey: ["lookups", "industries"],
    queryFn: () => lookupsApi.getIndustries(),
    staleTime: Infinity,
  });
}

export function useStoreCategoriesQuery() {
  return useQuery({
    queryKey: ["lookups", "storeCategories"],
    queryFn: () => lookupsApi.getStoreCategories(),
    staleTime: Infinity,
  });
}
