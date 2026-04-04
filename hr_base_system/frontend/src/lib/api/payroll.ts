import { Payslip as SharedPayslip, RunPayrollData } from '@simpala/types';
import apiClient from '../apiClient';

export interface Payslip extends SharedPayslip {
    createdAt: string;
    basicSalary?: number;
    grossPay?: number;
    epfEmployee?: number;
    epfEmployer?: number;
    netPay?: number;
}

export type PayrollRunData = RunPayrollData;

export interface PayrollListParams {
    month?: number;
    year?: number;
    employeeId?: string;
}

export const payrollApi = {
    runPayroll: async (data: PayrollRunData) => {
        const response = await apiClient.post<{
            success: boolean;
            payslips: Payslip[];
        }>('/payroll/run', data);
        return response.data;
    },

    generatePayslip: async (data: { employeeId: number; month: number; year: number }) => {
        const response = await apiClient.post<Payslip>('/payroll/generate', data);
        return response.data;
    },

    listPayslips: async (params: PayrollListParams = {}) => {
        const response = await apiClient.get<Payslip[]>('/payroll/payslips', {
            params,
        });
        return response.data;
    },

    getPayslip: async (id: string) => {
        const response = await apiClient.get<Payslip>(`/payroll/payslips/${id}`);
        return response.data;
    },

    downloadPayslipPdf: async (id: string) => {
        const response = await apiClient.get(`/payroll/payslips/${id}/pdf`, {
            responseType: 'blob',
        });
        return response.data;
    },

    generateBankFile: async (data: { month: number; year: number }) => {
        const response = await apiClient.post('/payroll/bank-file', data, {
            responseType: 'blob',
        });
        return response.data;
    },

    downloadBankFile: async (month: number, year: number) => {
        const response = await apiClient.post(
            '/payroll/bank-file',
            { month, year, fileType: 'CIPS' },
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },

    getStatistics: async (params: { month: number; year: number }) => {
        const response = await apiClient.get<{
            totalGrossPay: number;
            totalNetPay: number;
            totalEpfEmployee: number;
            totalEpfEmployer: number;
            totalEtf: number;
            totalPaye: number;
            employeeCount: number;
        }>('/payroll/statistics', { params });
        return response.data;
    },
};
