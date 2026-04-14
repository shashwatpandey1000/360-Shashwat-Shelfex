import apiClient from './client';

export interface EmployeeListParams {
  page?: number;
  perPage?: number;
  search?: string;
  roleTemplate?: 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor';
  status?: 'active' | 'inactive' | 'pending_first_login';
  sortBy?: 'name' | 'email' | 'createdAt' | 'roleTemplate';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEmployeeData {
  email: string;
  name: string;
  roleTemplate: 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor';
  scopeType: 'org' | 'zones' | 'stores';
  scopeEntityIds?: string[];
  phone?: string;
}

export const employeesApi = {
  async list(params?: EmployeeListParams) {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },
  async getById(id: string) {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },
  async create(data: CreateEmployeeData) {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },
  async update(id: string, data: Partial<CreateEmployeeData>) {
    const response = await apiClient.patch(`/employees/${id}`, data);
    return response.data;
  },
  async deactivate(id: string) {
    const response = await apiClient.post(`/employees/${id}/deactivate`);
    return response.data;
  },
  async assignStoreManager(storeId: string, employeeId: string) {
    const response = await apiClient.post(`/stores/${storeId}/manager`, { employeeId });
    return response.data;
  },
};
