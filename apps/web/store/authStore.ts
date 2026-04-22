import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; verificationLevel: string } | null;
  setAuth: (accessToken: string, refreshToken: string, user: AuthState['user']) => void;
  updateToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      updateToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'verified-auth' }
  )
);
