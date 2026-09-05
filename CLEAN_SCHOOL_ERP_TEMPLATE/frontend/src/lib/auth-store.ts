import { create } from 'zustand';

interface AuthUser {
  id: number;
  username: string;
  role: string;
  mustChangePassword?: boolean;
  teacher?: { id: number; fullName: string; photoUrl?: string } | null;
  student?: { id: number; fullName: string; studentId: string; photoUrl?: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  login: (user, token) => {
    localStorage.setItem('erp_token', token);
    localStorage.setItem('erp_user', JSON.stringify(user));
    set({ user, token, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    set({ user: null, token: null, isLoading: false });
  },
  setUser: (user) => set({ user }),
  initFromStorage: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('erp_token');
      const userStr = localStorage.getItem('erp_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },
}));

export type { AuthUser };
