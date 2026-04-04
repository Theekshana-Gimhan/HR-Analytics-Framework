import { AttendanceRecord, AttendanceStatus, AttendanceMonthlySummary, AttendanceCorrectionRequest, CheckInOutResult } from '@simpala/types';
import apiClient from '../apiClient';

export interface Attendance extends AttendanceRecord {
    dayType?: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
}

export interface AttendanceCreateData {
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: AttendanceStatus;
}

export interface AttendanceListParams {
    page?: number;
    limit?: number;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}

export const attendanceApi = {
    getMyAttendance: async (params: { startDate?: string; endDate?: string; month?: number; year?: number } = {}) => {
        const response = await apiClient.get<Attendance[]>('/attendance/me', { params });
        return response.data;
    },

    list: async (params: AttendanceListParams = {}) => {
        const response = await apiClient.get<{
            data: Attendance[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        }>('/attendance', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<Attendance>(`/attendance/${id}`);
        return response.data;
    },

    create: async (data: AttendanceCreateData) => {
        const response = await apiClient.post<Attendance>('/attendance', data);
        return response.data;
    },

    bulkUpload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{
            success: boolean;
            imported: number;
            errors?: string[];
        }>('/attendance/bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getDailyLog: async (date: string) => {
        const response = await apiClient.get<Array<{
            employeeId: number;
            firstName: string;
            lastName: string;
            department: string;
            jobTitle: string;
            shiftStartTime: string | null;
            shiftEndTime: string | null;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: string;
            isLate: boolean;
            attendanceId?: number;
        }>>('/attendance/daily-log', { params: { date } });
        return response.data;
    },

    // Sprint 2: Check-In / Check-Out
    checkIn: async () => {
        const response = await apiClient.post<CheckInOutResult>('/attendance/checkin');
        return response.data;
    },

    checkOut: async () => {
        const response = await apiClient.post<CheckInOutResult>('/attendance/checkout');
        return response.data;
    },

    // Sprint 2: Monthly Summary
    getMySummary: async (month?: number, year?: number) => {
        const params: Record<string, number> = {};
        if (month) params.month = month;
        if (year)  params.year  = year;
        const response = await apiClient.get<AttendanceMonthlySummary>('/attendance/me/summary', { params });
        return response.data;
    },

    // Sprint 2: Correction Requests (Employee)
    createCorrectionRequest: async (data: {
        date: string;
        requestedStatus: AttendanceStatus;
        reason: string;
        attendanceId?: number;
    }) => {
        const response = await apiClient.post<AttendanceCorrectionRequest>('/attendance/corrections', data);
        return response.data;
    },

    getMyCorrectionRequests: async () => {
        const response = await apiClient.get<AttendanceCorrectionRequest[]>('/attendance/corrections/mine');
        return response.data;
    },

    // Sprint 2: Correction Requests (Admin/Owner)
    getAllCorrectionRequests: async () => {
        const response = await apiClient.get<AttendanceCorrectionRequest[]>('/attendance/corrections');
        return response.data;
    },

    updateCorrectionRequest: async (id: number, data: { status: 'APPROVED' | 'REJECTED'; adminNotes?: string }) => {
        const response = await apiClient.patch<AttendanceCorrectionRequest>(`/attendance/corrections/${id}`, data);
        return response.data;
    },
};
