import apiClient from './client';

export const authApi = {
  async callback(code: string, state?: string | null, codeVerifier?: string | null) {
    const response = await apiClient.post('/auth/callback', {
      code,
      state,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });
    return response.data;
  },
  async me() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  async refresh() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};
