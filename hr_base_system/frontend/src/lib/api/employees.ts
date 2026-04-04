import { Employee as SharedEmployee, EmployeeDocument as SharedEmployeeDocument, PaginatedResponse } from '@simpala/types';
import apiClient from '../apiClient';

export interface Employee extends SharedEmployee {
    email?: string;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    dateOfBirth?: string | null;
    phone?: string;
    bankName?: string | null;
    user?: { email?: string };
    is_active?: boolean; // legacy field
    hire_date?: string;  // legacy field
    basic_salary?: number; // legacy field
}

export type EmployeeDocument = SharedEmployeeDocument;

export interface EmployeeListParams {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    isActive?: boolean;
}

export interface EmployeeCreateData {
    first_name: string;
    last_name: string;
    email: string;
    nic: string;
    phone?: string;
    date_of_birth: string;
    gender: string;
    address?: string;
    job_title: string;
    department: string;
    join_date: string;
    basic_salary: number;
    allowances?: number;
    bank_name?: string;
    bank_branch?: string;
    account_number?: string;
    account_holder_name?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export const employeesApi = {
    list: async (params: EmployeeListParams = {}) => {
        const response = await apiClient.get<PaginatedResponse<Employee>>('/employees', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<Employee>(`/employees/${id}`);
        return response.data;
    },

    create: async (data: EmployeeCreateData) => {
        const response = await apiClient.post<Employee>('/employees', data);
        return response.data;
    },

    update: async (id: string, data: Partial<EmployeeCreateData>) => {
        const response = await apiClient.put<Employee>(`/employees/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/employees/${id}`);
        return response.data;
    },

    getDocuments: async (employeeId: string) => {
        const response = await apiClient.get<EmployeeDocument[]>(
            `/employees/${employeeId}/documents`
        );
        return response.data;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadDocument: async (employeeId: string, file: File, metadata?: Record<string, any>) => {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata) {
            formData.append('metadata', JSON.stringify(metadata));
        }
        const response = await apiClient.post<EmployeeDocument>(
            `/employees/${employeeId}/documents`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    downloadDocument: async (employeeId: string, documentId: string) => {
        const response = await apiClient.get(
            `/employees/${employeeId}/documents/${documentId}`,
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },

    deleteDocument: async (employeeId: string, documentId: string) => {
        const response = await apiClient.delete(
            `/employees/${employeeId}/documents/${documentId}`
        );
        return response.data;
    },
};
