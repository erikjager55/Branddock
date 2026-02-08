import { create } from "zustand";

interface AuthState {
  user: null;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(() => ({
  user: null,
  isAuthenticated: false,
}));
