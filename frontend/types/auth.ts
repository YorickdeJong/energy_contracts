export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  profile_picture: string | null;
  role: 'admin' | 'landlord' | 'tenant' | 'user';
  is_active: boolean;
  is_verified: boolean;
  is_onboarded: boolean;
  onboarding_step: number;
  date_joined: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthError {
  error: string;
  details?: Record<string, string[]>;
}
