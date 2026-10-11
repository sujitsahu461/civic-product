import { create } from 'zustand';
import {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
  User,
  UserRole,
} from '../types/user';
import { authService } from '../services/auth.service';
import { useComplaintStore } from './complaintStore';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
  forgotPassword: (email: string) => Promise<{
    message: string;
    detail?: string;
    sent?: boolean;
    smtp_error?: string;
    reset_url?: string;
  }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ message: string }>;
  updateProfile: (payload: Partial<User>) => Promise<User>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(credentials);
      let user = response.user;
      if (!user) {
        user = await authService.getCurrentUser();
      }
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = 'Authentication failed. Please check your credentials.';
      if (status === 429) {
        msg = err.message || 'Too many login attempts. Please wait a moment before trying again.';
      } else if (typeof data === 'string' && data.length < 300) {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const fieldErrors: string[] = [];
        for (const [key, value] of Object.entries(data)) {
          const valText = Array.isArray(value) ? value.join(' ') : String(value);
          if (key === 'non_field_errors' || key === 'detail') {
            fieldErrors.push(valText);
          } else {
            const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            fieldErrors.push(`${fieldName}: ${valText}`);
          }
        }
        if (fieldErrors.length > 0) {
          msg = fieldErrors.join(' | ');
        }
      } else if (err.message && !err.message.includes('status code')) {
        msg = err.message;
      }
      set({ error: msg, isLoading: false, isAuthenticated: false });
      throw new Error(msg);
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(payload);
      let user = response.user;
      if (!user && response.tokens?.access) {
        user = await authService.getCurrentUser();
      }
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: null });
      }
      return response;
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = 'Registration failed. Please check your inputs.';
      if (status === 429) {
        msg = err.message || 'Too many registration attempts. Please wait a moment before trying again.';
      } else if (typeof data === 'string' && data.length < 300) {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const fieldErrors: string[] = [];
        for (const [key, value] of Object.entries(data)) {
          const valText = Array.isArray(value) ? value.join(' ') : String(value);
          if (key === 'non_field_errors' || key === 'detail') {
            fieldErrors.push(valText);
          } else {
            const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            fieldErrors.push(`${fieldName}: ${valText}`);
          }
        }
        if (fieldErrors.length > 0) {
          msg = fieldErrors.join(' | ');
        }
      } else if (err.message && !err.message.includes('status code')) {
        msg = err.message;
      }
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      useComplaintStore.getState().resetState();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('civicsetu_access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch {
      localStorage.removeItem('civicsetu_access_token');
      localStorage.removeItem('civicsetu_refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },

  forgotPassword: async (email) => {
    return await authService.forgotPassword({ email });
  },

  resetPassword: async (payload) => {
    return await authService.resetPassword(payload);
  },

  updateProfile: async (payload) => {
    const updated = await authService.updateProfile(payload);
    set((state) => ({
      user: state.user ? { ...state.user, ...updated } : (updated as User),
    }));
    return updated;
  },
}));

export default useAuthStore;
