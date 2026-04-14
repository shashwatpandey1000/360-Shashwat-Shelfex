import apiClient from './client';

export interface StoreListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: 'pending_tour' | 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateStoreData {
  name: string;
  categoryId?: string;
  address: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string;
  };
  location?: { latitude: number; longitude: number };
  timezone?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export const storesApi = {
  async list(params?: StoreListParams) {
    const response = await apiClient.get('/stores', { params });
    return response.data;
  },
  async getById(id: string) {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data;
  },
  async create(data: CreateStoreData) {
    const response = await apiClient.post('/stores', data);
    return response.data;
  },
  async update(id: string, data: Partial<CreateStoreData>) {
    const response = await apiClient.patch(`/stores/${id}`, data);
    return response.data;
  },
  async deactivate(id: string) {
    const response = await apiClient.post(`/stores/${id}/deactivate`);
    return response.data;
  },
};
