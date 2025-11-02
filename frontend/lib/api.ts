import axios from 'axios';
import type { LoginCredentials, RegisterData, LoginResponse, RegisterResponse, User } from '@/types/auth';
import type { Household, CreateHouseholdData, UpdateHouseholdData } from '@/types/household';
import type {
  OnboardingStatus,
  HouseholdOnboardingData,
  LandlordUpdateData,
  TenancyAgreement,
  ExtractedTenantData,
  TenantData,
} from '@/types/onboarding';
import type { AnalyticsResponse } from '@/types/analytics';
import type { TasksResponse, Task, CreateTaskData, UpdateTaskData, TaskFilters } from '@/types/tasks';
import type { VerifyInvitationResponse, AcceptInvitationData, AcceptInvitationResponse } from '@/types/invitations';

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

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    await api.post('/api/users/logout/',
      { refresh: refreshToken },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },

  async updateProfile(accessToken: string, data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/api/users/me/', data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

// Households API functions
export const householdsAPI = {
  async list(accessToken: string): Promise<{ results: Household[] }> {
    const response = await api.get<{ results: Household[] }>('/api/users/households/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async get(id: number, accessToken: string): Promise<Household> {
    const response = await api.get<Household>(`/api/users/households/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async create(data: CreateHouseholdData, accessToken: string): Promise<Household> {
    const response = await api.post<Household>('/api/users/households/', data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async update(id: number, data: UpdateHouseholdData, accessToken: string): Promise<Household> {
    const response = await api.patch<Household>(`/api/users/households/${id}/`, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async delete(id: number, accessToken: string): Promise<void> {
    await api.delete(`/api/users/households/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  async getMembers(id: number, accessToken: string) {
    const response = await api.get(`/api/users/households/${id}/members/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async addMember(id: number, email: string, accessToken: string, firstName?: string, lastName?: string) {
    const response = await api.post(`/api/users/households/${id}/add_member/`, {
      email,
      first_name: firstName,
      last_name: lastName,
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async removeMember(householdId: number, userId: number, accessToken: string) {
    const response = await api.delete(`/api/users/households/${householdId}/members/${userId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

// Onboarding API functions
export const onboardingAPI = {
  async getStatus(accessToken: string): Promise<OnboardingStatus> {
    const response = await api.get<OnboardingStatus>('/api/users/onboarding/status/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async createHousehold(data: HouseholdOnboardingData, accessToken: string): Promise<Household> {
    const response = await api.post<Household>(
      '/api/users/onboarding/household/',
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async updateLandlord(data: LandlordUpdateData, accessToken: string): Promise<User> {
    const response = await api.patch<User>(
      '/api/users/onboarding/landlord/',
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async uploadTenancyAgreement(
    householdId: number,
    file: File,
    accessToken: string
  ): Promise<TenancyAgreement> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('household', householdId.toString());

    const response = await api.post<TenancyAgreement>(
      '/api/users/onboarding/tenancy-agreements/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async processTenancyAgreement(
    agreementId: number,
    accessToken: string
  ): Promise<TenancyAgreement> {
    const response = await api.post<TenancyAgreement>(
      `/api/users/onboarding/tenancy-agreements/${agreementId}/process/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async getTenancyAgreement(
    agreementId: number,
    accessToken: string
  ): Promise<TenancyAgreement> {
    const response = await api.get<TenancyAgreement>(
      `/api/users/onboarding/tenancy-agreements/${agreementId}/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async addTenant(
    householdId: number,
    data: TenantData,
    accessToken: string
  ): Promise<User> {
    const response = await api.post<User>(
      `/api/users/onboarding/households/${householdId}/tenants/`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  async completeOnboarding(accessToken: string): Promise<void> {
    await api.post(
      '/api/users/onboarding/complete/',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },
};

// Analytics API functions
export const analyticsAPI = {
  async getAnalytics(accessToken: string, period: 'week' | 'month' | 'year' = 'month'): Promise<AnalyticsResponse> {
    const response = await api.get<AnalyticsResponse>('/api/analytics/', {
      params: { period },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

// Tasks API functions
export const tasksAPI = {
  async list(accessToken: string, filters?: TaskFilters): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/api/tasks/', {
      params: filters,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async get(id: number, accessToken: string): Promise<Task> {
    const response = await api.get<Task>(`/api/tasks/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async create(data: CreateTaskData, accessToken: string): Promise<Task> {
    const response = await api.post<Task>('/api/tasks/', data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async update(id: number, data: UpdateTaskData, accessToken: string): Promise<Task> {
    const response = await api.patch<Task>(`/api/tasks/${id}/`, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  async delete(id: number, accessToken: string): Promise<void> {
    await api.delete(`/api/tasks/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};

// Helper function for file uploads
export const uploadFile = async (
  file: File,
  endpoint: string,
  accessToken: string,
  additionalData?: Record<string, string>
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

// Invitation API functions
export const invitationsAPI = {
  async verify(token: string): Promise<VerifyInvitationResponse> {
    const response = await api.post<VerifyInvitationResponse>('/api/users/invitations/verify/', {
      token,
    });
    return response.data;
  },

  async accept(data: AcceptInvitationData): Promise<AcceptInvitationResponse> {
    const response = await api.post<AcceptInvitationResponse>('/api/users/invitations/accept/', data);
    return response.data;
  },
};
