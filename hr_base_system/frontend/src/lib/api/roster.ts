import { ShiftTemplate as SharedShiftTemplate, EmployeeShift as SharedEmployeeShift, AssignShiftData } from '@simpala/types';
import apiClient from '../apiClient';

export type ShiftTemplate = SharedShiftTemplate;
export type EmployeeShift = SharedEmployeeShift;

export interface ShiftTemplateCreateData {
    name: string;
    startTime: string;
    endTime: string;
    breakDuration?: number;
    color?: string;
}

export { type AssignShiftData };

export const shiftTemplatesApi = {
    list: async () => {
        const response = await apiClient.get<ShiftTemplate[]>('/shift-templates');
        return response.data;
    },

    create: async (data: ShiftTemplateCreateData) => {
        const response = await apiClient.post<ShiftTemplate>('/shift-templates', data);
        return response.data;
    },

    update: async (id: number, data: Partial<ShiftTemplateCreateData>) => {
        const response = await apiClient.put<ShiftTemplate>(`/shift-templates/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await apiClient.delete(`/shift-templates/${id}`);
        return response.data;
    },
};

export const rosterApi = {
    assignShift: async (data: AssignShiftData) => {
        const response = await apiClient.post<EmployeeShift>('/roster/assign', data);
        return response.data;
    },

    getRoster: async (startDate: string, endDate: string) => {
        const response = await apiClient.get<EmployeeShift[]>('/roster', {
            params: { startDate, endDate },
        });
        return response.data;
    },
};
