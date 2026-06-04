import { create } from "zustand";

export interface AuthUser {
  user_id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  status_text?: string | null;
  spotify_token?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) {
      localStorage.setItem("klc_rt", refreshToken);
    }
    set({ user, accessToken, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem("klc_rt");
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
