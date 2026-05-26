import apiClient from '@/lib/api/client';

export interface ZoneListParams {
  page?: number;
  perPage?: number;
  search?: string;
  parentZoneId?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateZoneData {
  name: string;
  description?: string;
  parentZoneId?: string | null;
}

export interface Zone {
  id: string;
  orgId: string;
  parentZoneId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const zonesApi = {
  async list(params?: ZoneListParams) {
    const response = await apiClient.get('/zones', { params });
    return response.data;
  },
  async getAll() {
    const response = await apiClient.get('/zones/all');
    return response.data;
  },
  async getById(id: string) {
    const response = await apiClient.get(`/zones/${id}`);
    return response.data;
  },
  async create(data: CreateZoneData) {
    const response = await apiClient.post('/zones', data);
    return response.data;
  },
  async update(id: string, data: Partial<CreateZoneData>) {
    const response = await apiClient.patch(`/zones/${id}`, data);
    return response.data;
  },
  async delete(id: string) {
    const response = await apiClient.delete(`/zones/${id}`);
    return response.data;
  },
};
