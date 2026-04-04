// React Query hooks for API calls

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  authApi,
  employeesApi,
  leaveApi,
  attendanceApi,
  payrollApi,
  dashboardApi,
  companyApi,
  usersApi,
  auditApi,
  expiryDocumentApi,
  type EmployeeListParams,
  type EmployeeCreateData,
  type LeaveRequestListParams,
  type LeaveRequestCreateData,
  type AttendanceListParams,
  type AttendanceCreateData,
  type PayrollListParams,
  type PayrollRunData,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateCompanySettingsData,
  type AuditLogListParams,
  type ExpiryDocumentListParams,
  type CreateExpiryDocumentData,
  type UpdateExpiryDocumentData,
} from './index';


// ==================== Query Keys ====================
export const queryKeys = {
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: (params: EmployeeListParams) => ['employees', 'list', params] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
    documents: (employeeId: string) => ['employees', employeeId, 'documents'] as const,
  },
  leave: {
    all: ['leave'] as const,
    types: ['leave', 'types'] as const,
    requests: (params: LeaveRequestListParams) => ['leave', 'requests', params] as const,
    request: (id: string) => ['leave', 'request', id] as const,
    balance: (employeeId: string | number) => ['leave', 'balance', employeeId] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    list: (params: AttendanceListParams) => ['attendance', 'list', params] as const,
    detail: (id: string) => ['attendance', 'detail', id] as const,
    dailyLog: (date: string) => ['attendance', 'dailyLog', date] as const,
    summary: (month: number, year: number) => ['attendance', 'summary', month, year] as const,
    corrections: ['attendance', 'corrections'] as const,
  },
  payroll: {
    all: ['payroll'] as const,
    payslips: (params: PayrollListParams) => ['payroll', 'payslips', params] as const,
    payslip: (id: string) => ['payroll', 'payslip', id] as const,
    statistics: (month: number, year: number) => ['payroll', 'statistics', month, year] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    liquidity: ['dashboard', 'liquidity'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: { page?: number; limit?: number; search?: string }) => ['users', 'list', params] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
  },
  company: {
    settings: ['company', 'settings'] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (params: AuditLogListParams) => ['audit', 'list', params] as const,
  },
  expiryDocuments: {
    all: ['expiryDocuments'] as const,
    list: (params: ExpiryDocumentListParams) => ['expiryDocuments', 'list', params] as const,
    detail: (id: number) => ['expiryDocuments', 'detail', id] as const,
    summary: ['expiryDocuments', 'summary'] as const,
  },
};

// ==================== Authentication ====================

export const useCurrentUser = (options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof authApi.getCurrentUser>>>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authApi.getCurrentUser,
    ...options,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Cache the user data
      queryClient.setQueryData(queryKeys.auth.currentUser, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
};

// ==================== Employees ====================

export const useEmployees = (params: EmployeeListParams = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.list(params),
    queryFn: () => employeesApi.list(params),
  });
};

export const useEmployee = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreateData) => employeesApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch employee lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmployeeCreateData> }) =>
      employeesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific employee and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};

export const useEmployeeDocuments = (employeeId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.employees.documents(employeeId),
    queryFn: () => employeesApi.getDocuments(employeeId),
    enabled: enabled && !!employeeId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ employeeId, file, metadata }: { employeeId: string; file: File; metadata?: Record<string, any> }) =>
      employeesApi.uploadDocument(employeeId, file, metadata),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.documents(variables.employeeId) });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, documentId }: { employeeId: string; documentId: string }) =>
      employeesApi.deleteDocument(employeeId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.documents(variables.employeeId) });
    },
  });
};

// ==================== Leave ====================

export const useLeaveTypes = () => {
  return useQuery({
    queryKey: queryKeys.leave.types,
    queryFn: leaveApi.listTypes,
    staleTime: 1000 * 60 * 30, // 30 minutes - leave types don't change often
  });
};

export const useLeaveRequests = (params: LeaveRequestListParams = {}) => {
  return useQuery({
    queryKey: queryKeys.leave.requests(params),
    queryFn: () => leaveApi.listRequests(params),
  });
};

export const useLeaveRequest = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.leave.request(id),
    queryFn: () => leaveApi.getRequestById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveRequestCreateData) => leaveApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
};

export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      leaveApi.approveRequest(id),
    onSuccess: (updated, variables) => {
      // Update detail cache immediately
      queryClient.setQueryData(queryKeys.leave.request(variables.id), updated);

      // Update any cached leave request lists
      const listQueries = queryClient.getQueryCache().findAll({ queryKey: ['leave', 'requests'] });
      for (const query of listQueries) {
        const queryKey = query.queryKey as unknown as (string | Record<string, unknown>)[];
        const params = queryKey?.[2] as { status?: string } | undefined;
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!Array.isArray(old)) return old;
          const isPendingList = params?.status === 'PENDING';
          if (isPendingList && updated?.status && updated.status !== 'PENDING') {
            return old.filter((item: { id?: string | number }) => item?.id !== updated.id);
          }
          return old.map((item: { id?: string | number }) => (item?.id === updated?.id ? updated : item));
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      // Also invalidate leave balances since approval affects balance
      queryClient.invalidateQueries({ queryKey: ['leave', 'balance'] });
    },
  });
};

export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      leaveApi.rejectRequest(id, reason),
    onSuccess: (updated, variables) => {
      // Update detail cache immediately
      queryClient.setQueryData(queryKeys.leave.request(variables.id), updated);

      // Update any cached leave request lists
      const listQueries = queryClient.getQueryCache().findAll({ queryKey: ['leave', 'requests'] });
      for (const query of listQueries) {
        const queryKey = query.queryKey as unknown as (string | Record<string, unknown>)[];
        const params = queryKey?.[2] as { status?: string } | undefined;
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!Array.isArray(old)) return old;
          const isPendingList = params?.status === 'PENDING';
          if (isPendingList && updated?.status && updated.status !== 'PENDING') {
            return old.filter((item: { id?: string | number }) => item?.id !== updated.id);
          }
          return old.map((item: { id?: string | number }) => (item?.id === updated?.id ? updated : item));
        });
      }
      queryClient.invalidateQueries({ queryKey: ['leave', 'balance'] });
    },
  });
};

export const useLeaveBalance = (employeeId: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.leave.balance(employeeId),
    queryFn: () => leaveApi.getBalance(employeeId),
    enabled: enabled && !!employeeId,
  });
};

export const useSelfLeaveBalance = () => {
  return useQuery({
    queryKey: ['leave', 'balance', 'me'] as const,
    queryFn: () => leaveApi.getMyBalance(),
  });
};

// ==================== Attendance ====================

export interface MyAttendanceParams {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

// Get my own attendance records (for Employee role)
export const useMyAttendance = (params: MyAttendanceParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ['attendance', 'me', params],
    queryFn: () => attendanceApi.getMyAttendance(params),
    enabled,
  });
};

// Get all attendance records (for Admin/Owner roles)
export const useAttendance = (params: AttendanceListParams = {}, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.attendance.list(params),
    queryFn: () => attendanceApi.list(params),
    enabled,
  });
};

// Get daily attendance log for a specific date (Admin/Owner only)
export const useDailyLog = (date: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.attendance.dailyLog(date),
    queryFn: () => attendanceApi.getDailyLog(date),
    enabled: enabled && !!date,
  });
};

export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendanceCreateData) => attendanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useBulkUploadAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attendanceApi.bulkUpload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

// Sprint 2: Check-In / Check-Out
export const useCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

// Sprint 2: Monthly Summary
export const useMyAttendanceSummary = (month?: number, year?: number, enabled = true) => {
  const m = month ?? new Date().getMonth() + 1;
  const y = year  ?? new Date().getFullYear();
  return useQuery({
    queryKey: queryKeys.attendance.summary(m, y),
    queryFn: () => attendanceApi.getMySummary(m, y),
    enabled,
  });
};

// Sprint 2: Correction Requests (Employee)
export const useMyCorrectionRequests = (enabled = true) => {
  return useQuery({
    queryKey: [...queryKeys.attendance.corrections, 'mine'],
    queryFn: () => attendanceApi.getMyCorrectionRequests(),
    enabled,
  });
};

export const useCreateCorrectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; requestedStatus: import('@simpala/types').AttendanceStatus; reason: string; attendanceId?: number }) =>
      attendanceApi.createCorrectionRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.corrections });
    },
  });
};

// Sprint 2: Correction Requests (Admin/Owner)
export const useAllCorrectionRequests = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.attendance.corrections,
    queryFn: () => attendanceApi.getAllCorrectionRequests(),
    enabled,
  });
};

export const useUpdateCorrectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: 'APPROVED' | 'REJECTED'; adminNotes?: string } }) =>
      attendanceApi.updateCorrectionRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.corrections });
    },
  });
};

// ==================== Payroll ====================

export const usePayslips = (params: PayrollListParams = {}) => {
  return useQuery({
    queryKey: queryKeys.payroll.payslips(params),
    queryFn: () => payrollApi.listPayslips(params),
  });
};

export const usePayslip = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.payroll.payslip(id),
    queryFn: () => payrollApi.getPayslip(id),
    enabled: enabled && !!id,
  });
};

export const useRunPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayrollRunData) => payrollApi.runPayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useGeneratePayslip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: number; month: number; year: number }) =>
      payrollApi.generatePayslip(data),
    onSuccess: () => {
      // Invalidate payroll and dashboard metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.liquidity });
    },
  });
};

export const usePayrollStatistics = (month: number, year: number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.payroll.statistics(month, year),
    queryFn: () => payrollApi.getStatistics({ month, year }),
    enabled: enabled && !!month && !!year,
  });
};

// ==================== Dashboard ====================

export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardApi.getStats,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

export const useLiquidityMetrics = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.liquidity,
    queryFn: dashboardApi.getLiquidity,
    refetchInterval: 1000 * 60 * 60, // Refetch every hour (or on demand)
  });
};

// ==================== Users (Admin) ====================

export const useUsers = (params: { page?: number; limit?: number; search?: string } = {}) => {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params),
  });
};

export const useUser = (id: number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserInput }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

// ==================== Company ====================

export const useCompanySettings = () => {
  return useQuery({
    queryKey: queryKeys.company.settings,
    queryFn: companyApi.getSettings,
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompanySettingsData) => companyApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.settings });
    },
  });
};

// ==================== Audit Logs ====================

export const useAuditLogs = (params: AuditLogListParams = {}, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => auditApi.list(params),
    enabled,
  });
};

// ==================== Expiry Documents ====================

export const useExpiryDocuments = (params: ExpiryDocumentListParams = {}, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.expiryDocuments.list(params),
    queryFn: () => expiryDocumentApi.list(params),
    enabled,
  });
};

export const useExpiryDocumentSummary = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.expiryDocuments.summary,
    queryFn: () => expiryDocumentApi.summary(),
    enabled,
  });
};

export const useCreateExpiryDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpiryDocumentData) => expiryDocumentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expiryDocuments.all });
    },
  });
};

export const useUpdateExpiryDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateExpiryDocumentData }) =>
      expiryDocumentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expiryDocuments.all });
    },
  });
};

export const useDeleteExpiryDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expiryDocumentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expiryDocuments.all });
    },
  });
};
