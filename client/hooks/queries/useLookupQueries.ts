import { useQuery } from "@tanstack/react-query";
import { lookupsApi } from "@/lib/api";

export function useIndustriesQuery() {
  return useQuery({
    queryKey: ["lookups", "industries"],
    queryFn: () => lookupsApi.getIndustries(),
  });
}

export function useStoreCategoriesQuery() {
  return useQuery({
    queryKey: ["lookups", "storeCategories"],
    queryFn: () => lookupsApi.getStoreCategories(),
  });
}
