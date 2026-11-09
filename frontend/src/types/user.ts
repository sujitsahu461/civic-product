export type UserRole = 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  public_id?: string;
  id?: number | string;
  email: string;
  username?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  role: UserRole;
  status?: UserStatus;
  department?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  designation?: string | null;
  bio?: string;
  profile_image?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  captcha_key?: string;
  captcha_code?: string;
}

export interface CaptchaResponse {
  captcha_key: string;
  captcha_svg: string;
  expires_in: number;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
  department?: string;
  designation?: string;
  address?: string;
  security_key?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  uid?: string;
  token?: string;
  email?: string;
  new_password?: string;
  password?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
