import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { zonesApi, ZoneListParams } from "./api";

export function useZonesQuery(params?: ZoneListParams) {
  return useQuery({
    queryKey: ["zones", params],
    queryFn: () => zonesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAllZonesQuery() {
  return useQuery({
    queryKey: ["zones", "all"],
    queryFn: () => zonesApi.getAll(),
  });
}

export function useZoneByIdQuery(id: string) {
  return useQuery({
    queryKey: ["zone", id],
    queryFn: () => zonesApi.getById(id),
    enabled: !!id,
  });
}
