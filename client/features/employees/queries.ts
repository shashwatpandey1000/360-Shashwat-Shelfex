import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { employeesApi, EmployeeListParams } from "./api";

export function useEmployeesQuery(params?: EmployeeListParams) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => employeesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeByIdQuery(id: string) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
}
