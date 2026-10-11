import api from './api';
import {
  AuthResponse,
  CaptchaResponse,
  ForgotPasswordPayload,
  LoginCredentials,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '../types/user';

export const authService = {
  async getCaptcha(): Promise<CaptchaResponse> {
    const res = await api.get<CaptchaResponse>('/auth/captcha/');
    return res.data;
  },
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login/', credentials);
    const data = res.data;
    if (data.tokens?.access) {
      localStorage.setItem('civicsetu_access_token', data.tokens.access);
      localStorage.setItem('civicsetu_refresh_token', data.tokens.refresh);
    }
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register/', payload);
    const data = res.data;
    if (data.tokens?.access) {
      localStorage.setItem('civicsetu_access_token', data.tokens.access);
      localStorage.setItem('civicsetu_refresh_token', data.tokens.refresh);
    }
    return data;
  },

  async logout(): Promise<void> {
    const refresh = localStorage.getItem('civicsetu_refresh_token');
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('civicsetu_access_token');
      localStorage.removeItem('civicsetu_refresh_token');
    }
  },

  async getCurrentUser(): Promise<User> {
    const res = await api.get<User>('/auth/me/');
    return res.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{
    message: string;
    detail?: string;
    sent?: boolean;
    smtp_error?: string;
    reset_url?: string;
  }> {
    const res = await api.post('/auth/forgot-password/', payload);
    return res.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/reset-password/', payload);
    return res.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/users/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  async updateProfile(payload: Partial<User>): Promise<User> {
    const res = await api.patch<User>('/users/profile/update/', payload);
    return res.data;
  },
};

export default authService;
