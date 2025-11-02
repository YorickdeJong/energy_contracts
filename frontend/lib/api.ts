import axios from 'axios';
import type { LoginCredentials, RegisterData, LoginResponse, RegisterResponse, User } from '@/types/auth';
import type { Household, CreateHouseholdData, UpdateHouseholdData } from '@/types/household';

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

// Households API functions
export const householdsAPI = {
  async list(): Promise<{ results: Household[] }> {
    const response = await api.get<{ results: Household[] }>('/api/users/households/');
    return response.data;
  },

  async get(id: number): Promise<Household> {
    const response = await api.get<Household>(`/api/users/households/${id}/`);
    return response.data;
  },

  async create(data: CreateHouseholdData): Promise<Household> {
    const response = await api.post<Household>('/api/users/households/', data);
    return response.data;
  },

  async update(id: number, data: UpdateHouseholdData): Promise<Household> {
    const response = await api.patch<Household>(`/api/users/households/${id}/`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/users/households/${id}/`);
  },

  async getMembers(id: number) {
    const response = await api.get(`/api/users/households/${id}/members/`);
    return response.data;
  },

  async addMember(id: number, email: string, firstName?: string, lastName?: string) {
    const response = await api.post(`/api/users/households/${id}/add_member/`, {
      email,
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  },

  async removeMember(householdId: number, userId: number) {
    const response = await api.delete(`/api/users/households/${householdId}/members/${userId}/`);
    return response.data;
  },
};
