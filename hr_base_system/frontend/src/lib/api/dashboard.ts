import { DashboardStats, LiquidityData } from '@simpala/types';
import apiClient from '../apiClient';
import { Employee } from './employees';
import { LeaveType } from './leave';

export const dashboardApi = {
    getStats: async () => {
        const response = await apiClient.get<DashboardStats & {
            activeEmployees: number;
            upcomingLeaves: Array<{
                employee: Employee;
                leaveType: LeaveType;
                startDate: string;
                endDate: string;
            }>;
        }>('/dashboard/stats');
        return response.data;
    },

    getLiquidity: async () => {
        const response = await apiClient.get<LiquidityData & {
            totalCost: number;
            breakdown: {
                accruedBasic: number;
                epfEtf: number;
            };
        }>('/dashboard/liquidity');
        return response.data;
    },
};
