import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const client = axios.create({ baseURL: `${BASE_URL}/api/v1` });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  get: (url: string) => client.get(url).then((r) => r.data),
  post: (url: string, data?: object) => client.post(url, data).then((r) => r.data),
  patch: (url: string, data?: object) => client.patch(url, data).then((r) => r.data),
  delete: (url: string) => client.delete(url).then((r) => r.data),
};
