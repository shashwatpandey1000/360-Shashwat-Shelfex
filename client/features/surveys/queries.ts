import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { surveysApi } from "./api";

export function useSurveysQuery(params?: {
  storeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["surveys", params],
    queryFn: () => surveysApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSurveyByIdQuery(id: string) {
  return useQuery({
    queryKey: ["survey", id],
    queryFn: () => surveysApi.getById(id),
    enabled: !!id,
  });
}
