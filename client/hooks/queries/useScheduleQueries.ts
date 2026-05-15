import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { scheduleApi, SlotStatus } from "@/lib/api";

export function useScheduleTemplatesQuery() {
  return useQuery({
    queryKey: ["scheduleTemplates"],
    queryFn: () => scheduleApi.listTemplates(),
  });
}

export function useScheduleTemplateQuery(id: string) {
  return useQuery({
    queryKey: ["scheduleTemplate", id],
    queryFn: () => scheduleApi.getTemplate(id),
    enabled: !!id,
  });
}

export function useOrgDefaultTemplateQuery() {
  return useQuery({
    queryKey: ["scheduleTemplate", "default"],
    queryFn: () => scheduleApi.getOrgDefaultTemplate(),
  });
}

export function useStoreEffectiveTemplateQuery(storeId: string) {
  return useQuery({
    queryKey: ["scheduleTemplate", "store", storeId],
    queryFn: () => scheduleApi.getStoreEffectiveTemplate(storeId),
    enabled: !!storeId,
  });
}

export function useScheduleSlotsQuery(params?: {
  page?: number;
  perPage?: number;
  storeId?: string;
  status?: SlotStatus;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["scheduleSlots", params],
    queryFn: () => scheduleApi.listSlots(params),
    placeholderData: keepPreviousData,
  });
}

export function useScheduleSlotQuery(id: string) {
  return useQuery({
    queryKey: ["scheduleSlot", id],
    queryFn: () => scheduleApi.getSlot(id),
    enabled: !!id,
  });
}

export function useScheduleAssignmentsQuery(storeId?: string) {
  return useQuery({
    queryKey: ["scheduleAssignments", storeId ?? "all"],
    queryFn: () => scheduleApi.listAssignments(storeId),
  });
}
