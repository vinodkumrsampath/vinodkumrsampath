import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const client = axios.create({ baseURL: `${BASE_URL}/api/v1` });

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (r) => r.data,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
          useAuthStore.getState().updateToken(data.accessToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(error.config);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    throw error;
  }
);

export const api = {
  get: (url: string, params?: object) => client.get(url, { params }) as unknown as Promise<any>,
  post: (url: string, data?: object) => client.post(url, data) as unknown as Promise<any>,
  patch: (url: string, data?: object) => client.patch(url, data) as unknown as Promise<any>,
  delete: (url: string) => client.delete(url) as unknown as Promise<any>,
};
