import apiClient from './client';

export const lookupsApi = {
  async getIndustries() {
    const response = await apiClient.get('/lookups/industries');
    return response.data;
  },
  async getStoreCategories() {
    const response = await apiClient.get('/lookups/store-categories');
    return response.data;
  },
};
