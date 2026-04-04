import { Role, PaginatedResponse } from '@simpala/types';
import apiClient from '../apiClient';
import { User } from './auth';
import { Employee, EmployeeCreateData } from './employees';

export interface CreateUserInput {
    email: string;
    password?: string;
    role: Role;
    employeeId?: number;
}

export interface UpdateUserInput {
    email?: string;
    role?: Role;
    isActive?: boolean;
}

export type UsersResponse = PaginatedResponse<User>;

export const usersApi = {
    getProfile: async () => {
        const response = await apiClient.get<User & { employee?: Employee }>('/users/me');
        return response.data;
    },

    updateProfile: async (data: Partial<EmployeeCreateData>) => {
        const response = await apiClient.patch<Employee>('/users/me', data);
        return response.data;
    },

    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
        const response = await apiClient.post('/users/me/change-password', data);
        return response.data;
    },

    list: async (params: { page?: number; limit?: number; search?: string } = {}) => {
        const response = await apiClient.get<UsersResponse | User[]>('/users', { params });
        return response.data as UsersResponse;
    },

    getById: async (id: number) => {
        const response = await apiClient.get<User>(`/users/${id}`);
        return response.data;
    },

    create: async (data: CreateUserInput) => {
        const response = await apiClient.post<User>('/users', data);
        return response.data;
    },

    update: async (id: number, data: UpdateUserInput) => {
        const response = await apiClient.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await apiClient.delete<User>(`/users/${id}`);
        return response.data;
    },
};
