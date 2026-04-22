import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: { id: string; email: string; verificationLevel: string } | null;
  setAuth: (accessToken: string, refreshToken: string, user: AuthState['user']) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setAuth: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null });
  },
}));
