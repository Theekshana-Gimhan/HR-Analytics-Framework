import { AuthUser } from '@simpala/types';
import apiClient from '../apiClient';

export interface User extends AuthUser {
  email: string;
  isActive: boolean;
  employeeId?: number;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', { refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
