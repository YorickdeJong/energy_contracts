import axios from 'axios';
import type { LoginCredentials, RegisterData, LoginResponse, RegisterResponse, User } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth API functions
export const authAPI = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/users/login/', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/api/users/register/', data);
    return response.data;
  },

  async getCurrentUser(accessToken: string): Promise<User> {
    const response = await api.get<User>('/api/users/me/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    const response = await api.post('/api/users/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/api/users/logout/', {
      refresh: refreshToken,
    });
  },
};
