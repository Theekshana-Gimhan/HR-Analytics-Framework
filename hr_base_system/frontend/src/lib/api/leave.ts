import {
    LeaveRequestStatus,
    LeaveRequest as SharedLeaveRequest,
    LeaveType as SharedLeaveType,
    BalanceWithLeaveType as SharedBalanceWithLeaveType
} from '@simpala/types';
import apiClient from '../apiClient';

export type { LeaveRequestStatus };

export interface LeaveRequest extends SharedLeaveRequest {
    approverId?: number;
    startDate?: string;
    endDate?: string;
    leave_type_id?: number;
}

export type LeaveType = SharedLeaveType;
export type BalanceWithLeaveType = SharedBalanceWithLeaveType;
export type LeaveBalance = BalanceWithLeaveType;

export interface LeaveRequestCreateData {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
}

export interface LeaveRequestListParams {
    page?: number;
    limit?: number;
    status?: LeaveRequestStatus;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
}

const normalizeLeaveRequest = (item: LeaveRequest): LeaveRequest => ({
    ...item,
    employeeId: (item as { employeeId?: number; employee_id?: number }).employeeId ?? (item as { employee_id?: number }).employee_id ?? item.employeeId,
    leaveTypeId: (item as { leaveTypeId?: number; leave_type_id?: number }).leaveTypeId ?? (item as { leave_type_id?: number }).leave_type_id ?? item.leaveTypeId,
    start_date: item.start_date ?? (item as { startDate?: string }).startDate,
    end_date: item.end_date ?? (item as { endDate?: string }).endDate,
    leave_type: item.leave_type ?? (item as { leaveType?: { name: string } }).leaveType,
});

export const leaveApi = {
    listTypes: async () => {
        const response = await apiClient.get<LeaveType[]>('/leave/types');
        return response.data;
    },

    getTypeById: async (id: string) => {
        const response = await apiClient.get<LeaveType>(`/leave/types/${id}`);
        return response.data;
    },

    listRequests: async (params: LeaveRequestListParams = {}) => {
        const response = await apiClient.get<LeaveRequest[] | { data: LeaveRequest[] }>('/leave/requests', {
            params,
        });

        const raw = Array.isArray(response.data)
            ? response.data
            : (response.data as { data?: LeaveRequest[] }).data ?? [];

        return raw.map(normalizeLeaveRequest);
    },

    getRequestById: async (id: string) => {
        const response = await apiClient.get<LeaveRequest>(`/leave/requests/${id}`);
        return normalizeLeaveRequest(response.data);
    },

    createRequest: async (data: LeaveRequestCreateData) => {
        const payload = {
            leaveTypeId: data.leaveTypeId,
            start_date: data.startDate,
            end_date: data.endDate,
            reason: data.reason,
        };
        const response = await apiClient.post<LeaveRequest>('/leave/requests', payload);
        return normalizeLeaveRequest(response.data);
    },

    approveRequest: async (id: string) => {
        const response = await apiClient.post<LeaveRequest>(
            `/leave/requests/${id}/approve`
        );
        return normalizeLeaveRequest(response.data);
    },

    rejectRequest: async (id: string, reason?: string) => {
        const response = await apiClient.post<LeaveRequest>(
            `/leave/requests/${id}/reject`,
            reason ? { reason } : undefined
        );
        return normalizeLeaveRequest(response.data);
    },

    getBalance: async (employeeId: string | number) => {
        const response = await apiClient.get<
            LeaveBalance[] | { employeeId: number; balances: LeaveBalance[] }
        >(`/employees/${employeeId}/leave-balance`);

        return Array.isArray(response.data)
            ? response.data
            : response.data.balances ?? [];
    },

    getMyBalance: async (): Promise<SelfLeaveBalance[]> => {
        const response = await apiClient.get<
            { employeeId: number; balances: SelfLeaveBalance[] }
        >('/leave/balance/me');
        return response.data.balances ?? [];
    },
};

/** Shape returned by /leave/balance/me and /employees/:id/leave-balance */
export interface SelfLeaveBalance {
    leaveTypeId: number;
    leaveTypeName: string;
    accrued: number;
    used: number;
    carriedForward: number;
    available: number;
    requiresAnniversary: boolean;
}
