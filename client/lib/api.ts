import axios from 'axios';

// For non-auth API calls (direct to 360 server)
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API calls go through same-origin Next.js API routes
// so cookies are set on the client's domain (not the 360 server's domain)
export const authApi = {
  async callback(code: string, state?: string | null, codeVerifier?: string | null) {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        state,
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data, status: response.status } };
    return data;
  },

  async me() {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok) throw { response: { data, status: response.status } };
    return data;
  },

  async refresh() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data, status: response.status } };
    return data;
  },

  async logout() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data, status: response.status } };
    return data;
  },
};

export default apiClient;
