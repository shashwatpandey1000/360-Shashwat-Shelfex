import apiClient from '@/lib/api/client';

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

export interface BulkImportResponse {
  created: number;
  createdDetails: { storeName: string; managerEmail: string; isNewManager: boolean }[];
  failed: { row: number; storeName: string; reason: string }[];
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
  async bulkImport(file: File): Promise<{ success: boolean; message: string; data: BulkImportResponse }> {
    const form = new FormData();
    form.append('file', file);
    // Let axios handle Content-Type with boundary by omitting it here
    const response = await apiClient.post('/stores/bulk-import', form, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },
};
