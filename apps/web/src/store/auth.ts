import { create } from "zustand";

import type { User } from "@/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (accessToken: string, refreshToken: string, user: User) => void;
  clearSession: () => void;
}

const ACCESS_TOKEN_KEY = "changeradar.access_token";
const REFRESH_TOKEN_KEY = "changeradar.refresh_token";

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: null,
  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set({ accessToken, refreshToken, user });
  },
  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
