// =============================================
// Enums
// =============================================

export type Role = 'OWNER' | 'ADMIN' | 'EMPLOYEE';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'WFH' | 'ON_LEAVE';
export type DocumentCategory = 'MEDICAL_REPORT' | 'EPF_FORM' | 'POLICE_REPORT' | 'CONTRACT' | 'IDENTIFICATION' | 'OTHER';
export type EmploymentStatus = 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'TERMINATED' | 'RESIGNED';
export type BankFileType = 'CIPS' | 'SLIPS';
export type ShiftStatus = 'SCHEDULED' | 'COMPLETED' | 'ABSENT' | 'CANCELLED';
export type ExpiryDocumentType = 'LICENSE' | 'CERTIFICATION' | 'VISA' | 'WORK_PERMIT' | 'MEDICAL_CERTIFICATE' | 'BACKGROUND_CHECK' | 'OTHER';
export type ExpiryDocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED';

// =============================================
// Employee
// =============================================

export type Employee = {
  id: number;
  userId: number;
  first_name: string;
  last_name: string;
  nic: string;
  job_title: string;
  salary: number;
  bank_details: string;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  department?: string | null;
  gender?: string | null;
  allowances?: number | null;
  isActive: boolean;
  deletedAt?: string | null;
  employmentStatus: EmploymentStatus;
  date_of_birth?: string | null;
  phone_number?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  employmentStartDate: string;
};

/** Minimal employee reference used in nested responses */
export type EmployeeSummary = {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
};

// =============================================
// Auth
// =============================================

export type LoginResponse = {
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: number;
    email: string;
    role: Role;
    companyId: number;
  };
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
};

export type AuthUser = {
  id: number;
  role: Role;
  companyId: number;
};

// =============================================
// Leave
// =============================================

export type BalanceWithLeaveType = {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  accrued: number;
  used: number;
  carriedForward: number;
  lastAccruedAt: Date | null;
  leaveType: {
    id: number;
    name: string;
    defaultBalance: number;
    requiresAnniversary: boolean;
  };
};

export type CreateLeaveTypeData = {
  name: string;
  default_balance: number;
  companyId: number;
  requires_anniversary?: boolean;
};

export type ApplyForLeaveData = {
  leaveTypeId: number;
  start_date: string;
  end_date: string;
  reason?: string;
};

export type LeaveRequest = {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  start_date: string;
  end_date: string;
  status: LeaveRequestStatus;
  totalDays?: number;
  reason?: string;
  created_at?: string;
  updated_at?: string;
  employee?: EmployeeSummary;
  leaveType?: {
    name: string;
  };
  leave_type?: {
    name: string;
  };
};

export type LeaveType = {
  id: number;
  companyId: number;
  name: string;
  defaultBalance: number;
  requiresAnniversary: boolean;
};

// =============================================
// Attendance
// =============================================

export type AttendanceRecord = {
  id: number;
  employeeId: number;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  createdAt: string;
  employee?: EmployeeSummary;
};

export type CreateAttendanceData = {
  employeeId: number;
  date: string;
  status: AttendanceStatus;
};

// =============================================
// Payroll
// =============================================

export type Payslip = {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  gross_pay: number;
  epf_employee: number;
  epf_employer: number;
  etf: number;
  paye: number;
  net_pay: number;
  employee?: EmployeeSummary;
};

export type GeneratePayslipData = {
  employeeId: number;
  month: number;
  year: number;
};

export type RunPayrollData = {
  month: number;
  year: number;
  employeeIds?: number[];
};

export type BankFileExport = {
  id: number;
  companyId: number;
  bankCode: string;
  fileType: BankFileType;
  month: number;
  year: number;
  totalRecords: number;
  totalAmount: number;
  generatedAt: string;
  fileName: string;
};

// =============================================
// Roster / Shifts
// =============================================

export type ShiftTemplate = {
  id: number;
  companyId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  color?: string | null;
  isActive: boolean;
  isOvernight?: boolean;
};

export type EmployeeShift = {
  id: number;
  employeeId: number;
  shiftTemplateId: number;
  date: string;
  status: ShiftStatus;
  notes?: string | null;
  employee?: EmployeeSummary;
  shiftTemplate?: ShiftTemplate;
};

export type AssignShiftData = {
  employeeId: number;
  shiftTemplateId: number;
  date: string;
};

// =============================================
// Documents
// =============================================

export type EmployeeDocument = {
  id: number;
  employeeId: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  storageProvider: string;
  category?: DocumentCategory | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpiryDocument = {
  id: number;
  employeeId: number;
  documentId?: number | null;
  documentType: ExpiryDocumentType;
  name: string;
  issueDate?: string | null;
  expiryDate: string;
  alertDaysBefore: number;
  status: ExpiryDocumentStatus;
  notes?: string | null;
};

// =============================================
// Dashboard
// =============================================

export type DashboardStats = {
  totalEmployees: number;
  pendingLeaves: number;
  upcomingLeaves: number;
  todayPresent?: number;
  todayAbsent?: number;
};

export type LiquidityData = {
  estimatedCost: number;
  basicTotal: number;
  allowancesTotal: number;
  epfEmployer: number;
  etfTotal: number;
  daysInMonth: number;
  daysElapsed: number;
};

// =============================================
// Audit Trail
// =============================================

export type AuditLogEntry = {
  id: number;
  userId: number;
  companyId: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

// =============================================
// API Response Wrappers
// =============================================

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiError = {
  message: string;
  errors?: Array<{ field: string; message: string }>;
};

// =============================================
// Sprint 2: Attendance Check-In/Out & Corrections
// =============================================

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AttendanceCorrectionRequest = {
  id: number;
  employeeId: number;
  attendanceId?: number | null;
  date: string;
  requestedStatus: AttendanceStatus;
  reason: string;
  adminNotes?: string | null;
  status: CorrectionStatus;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    department?: string | null;
  };
  attendance?: {
    id: number;
    status: AttendanceStatus;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  } | null;
};

export type AttendanceMonthlySummary = {
  month: number;
  year: number;
  employeeId: number;
  total: number;
  summary: {
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    HALF_DAY: number;
    WFH: number;
    ON_LEAVE: number;
  };
};

export type CheckInOutResult = {
  message: string;
  record: AttendanceRecord;
};
