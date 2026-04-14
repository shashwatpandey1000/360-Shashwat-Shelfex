import apiClient from './client';

export const orgApi = {
  async register(data: {
    orgName: string;
    orgType: 'chain' | 'single_store';
    industryId: string;
    country?: string;
    currency?: string;
    timezone?: string;
    website?: string;
    contactPhone?: string;
    hqAddress?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      formattedAddress?: string;
      lat?: number;
      lng?: number;
    };
  }) {
    const response = await apiClient.post('/orgs/register', data);
    return response.data;
  },
  async getSettings() {
    const response = await apiClient.get('/orgs/settings');
    return response.data;
  },
  async updateSettings(data: Record<string, unknown>) {
    const response = await apiClient.patch('/orgs/settings', data);
    return response.data;
  },
};
