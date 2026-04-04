// import { BankFileType } from '@prisma/client';
import { z } from 'zod';

const bankFileTypeValues = ['CIPS', 'SLIPS'] as const;

// Strong password validation - exported for potential future use in registration
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'), // Keep lenient for login
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Employee schemas
export const createEmployeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email(),
  password: z.string().optional(), // Optional - will auto-generate if not provided
  nic: z.string().min(1, 'NIC is required'),
  job_title: z.string().min(1, 'Job title is required'),
  // Accept both salary and basic_salary
  salary: z.number().positive('Salary must be positive').optional(),
  basic_salary: z.number().positive('Basic salary must be positive').optional(),
  // Bank details - accept either consolidated string or individual fields
  bank_details: z.string().optional(),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_code: z.string().optional(),
  branch_code: z.string().optional(),
  account_number: z.string().optional(),
  account_holder_name: z.string().optional(),
  // Personal details
  date_of_birth: z.string().optional(),
  phone_number: z.string().optional(),
  phone: z.string().optional(), // Accept both phone and phone_number
  address: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  // Employment details - accept both join_date and employment_start_date
  employment_start_date: z.string().optional(),
  join_date: z.string().optional(),
  department: z.string().optional(),
  allowances: z.number().optional(),
}).refine(
  (data) => data.salary || data.basic_salary,
  { message: 'Either salary or basic_salary is required', path: ['salary'] }
);

export const updateEmployeeSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  job_title: z.string().optional(),
  salary: z.number().positive('Salary must be positive').optional(),
  basic_salary: z.number().positive('Salary must be positive').optional(),
  bank_details: z.string().optional(),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_code: z.string().optional(),
  branch_code: z.string().optional(),
  account_number: z.string().optional(),
  account_holder_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone_number: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  employment_start_date: z.string().optional(),
  join_date: z.string().optional(),
  department: z.string().optional(),
  gender: z.string().optional(),
  allowances: z.number().optional(),
});

export const employeeQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const employeeIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'Employee ID must be a positive integer' }),
});

export const employeeDocumentParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'Employee ID must be a positive integer' }),
  documentId: z.string().regex(/^\d+$/, { message: 'Document ID must be a positive integer' }),
});

// Payroll schemas
export const generatePayslipSchema = z.object({
  employeeId: z.number().int().positive('Employee ID must be a positive integer'),
  month: z.number().int().min(1).max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2000).max(2100, 'Year must be between 2000 and 2100'),
});

export const runPayrollSchema = z.object({
  month: z.number().int().min(1).max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2000).max(2100, 'Year must be between 2000 and 2100'),
  employeeIds: z.array(z.number().int().positive()).optional(),
});

export const generateBankFileSchema = z.object({
  month: z.number().int().min(1).max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2000).max(2100, 'Year must be between 2000 and 2100'),
  fileType: z.enum(bankFileTypeValues),
  bankCodes: z.array(z.string().min(3, 'Bank code must have at least 3 characters')).optional(),
  narration: z.string().max(60, 'Narration cannot exceed 60 characters').optional(),
});

// Attendance schemas
export const createAttendanceSchema = z.object({
  employeeId: z.number().int().positive('Employee ID must be a positive integer'),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date format'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'WFH', 'ON_LEAVE']),
});

// Leave schemas
export const createLeaveTypeSchema = z
  .object({
    companyId: z.number().int().positive('Company ID must be a positive integer').optional(),
    name: z.string().min(1, 'Leave type name is required'),
    // Accept both snake_case and camelCase payloads for backward compatibility
    default_balance: z.number().min(0, 'Default balance cannot be negative').optional(),
    defaultBalance: z.number().min(0, 'Default balance cannot be negative').optional(),
    requires_anniversary: z.boolean().optional(),
    requiresAnniversary: z.boolean().optional(),
  })
  .refine(
    (data) => data.default_balance !== undefined || data.defaultBalance !== undefined,
    { message: 'Default balance is required', path: ['default_balance'] }
  )
  .transform((data) => ({
    companyId: data.companyId,
    name: data.name,
    default_balance: (data.default_balance ?? data.defaultBalance) as number,
    requires_anniversary: data.requires_anniversary ?? data.requiresAnniversary,
  }));

export const applyForLeaveSchema = z.object({
  // Accept both string and number for leaveTypeId (frontend sends string)
  leaveTypeId: z.union([
    z.number().int().positive('Leave type ID must be a positive integer'),
    z.string().regex(/^\d+$/, 'Leave type ID must be a numeric string').transform(Number),
  ]),
  // Accept both snake_case and camelCase field names
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().max(500).optional(),
}).transform((data) => ({
  leaveTypeId: data.leaveTypeId,
  start_date: data.start_date ?? data.startDate,
  end_date: data.end_date ?? data.endDate,
  reason: data.reason,
})).refine((data) => data.start_date && data.end_date, {
  message: 'Both start date and end date are required',
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
});

export const updateLeaveTypeSchema = z
  .object({
    name: z.string().min(1, 'Leave type name cannot be empty').optional(),
    // Accept both snake_case and camelCase payloads
    default_balance: z.number().min(0, 'Default balance cannot be negative').optional(),
    defaultBalance: z.number().min(0, 'Default balance cannot be negative').optional(),
    requires_anniversary: z.boolean().optional(),
    requiresAnniversary: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.default_balance !== undefined ||
      data.defaultBalance !== undefined ||
      data.requires_anniversary !== undefined ||
      data.requiresAnniversary !== undefined,
    { message: 'At least one field must be provided' }
  )
  .transform((data) => ({
    name: data.name,
    default_balance: data.default_balance ?? data.defaultBalance,
    requires_anniversary: data.requires_anniversary ?? data.requiresAnniversary,
  }));

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type GeneratePayslipInput = z.infer<typeof generatePayslipSchema>;
export type GenerateBankFileInput = z.infer<typeof generateBankFileSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type ApplyForLeaveInput = z.infer<typeof applyForLeaveSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type EmployeeIdParams = z.infer<typeof employeeIdParamsSchema>;
export type EmployeeDocumentParams = z.infer<typeof employeeDocumentParamsSchema>;

// Shift Template schemas
export const createShiftTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Validation: Time format HH:mm (strict)
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  breakDuration: z.number().min(0).optional(),
  color: z.string().optional(),
  isOvernight: z.boolean().optional(),
}).refine((data) => {
  // Allow overnight shifts (e.g., 22:00 to 06:00) when endTime < startTime
  // Only reject when times are exactly equal
  return data.endTime !== data.startTime;
}, {
  message: 'Start time and end time cannot be the same',
  path: ['endTime'],
});

export const updateShiftTemplateSchema = z.object({
  name: z.string().optional(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  breakDuration: z.number().min(0).optional(),
  color: z.string().optional(),
  isOvernight: z.boolean().optional(),
});

// Roster schemas
export const assignShiftSchema = z.object({
  employeeId: z.number().int().positive(),
  shiftTemplateId: z.number().int().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export const getRosterSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
});

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;
export type GetRosterInput = z.infer<typeof getRosterSchema>;

// Auth - forgot/reset password
export const forgotPasswordSchema = z.object({
  email: z.string().email('A valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// User profile
export const updateProfileSchema = z.object({
  phone_number: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  date_of_birth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .optional(),
  bank_name: z.string().max(100).optional(),
  bank_branch: z.string().max(100).optional(),
  account_number: z.string().max(50).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// WebAuthn schemas (F22)
export const webauthnRegisterVerifySchema = z.object({
  response: z.object({}).passthrough(), // RegistrationResponseJSON — validated by @simplewebauthn/server
  friendlyName: z.string().max(100, 'Friendly name cannot exceed 100 characters').optional(),
});

export const webauthnAuthenticateVerifySchema = z.object({
  response: z.object({}).passthrough(), // AuthenticationResponseJSON — validated by @simplewebauthn/server
});

export const webauthnCredentialIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'Credential ID must be a positive integer' }),
});

// Sprint 2 — Attendance Correction Requests
export const createCorrectionRequestSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  requestedStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'WFH', 'ON_LEAVE']),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  attendanceId: z.number().int().positive().optional(),
});

export const updateCorrectionRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNotes: z.string().optional(),
});

// Sprint 4 — Expiry Document CRUD
export const createExpiryDocumentSchema = z.object({
  employeeId: z.number().int().positive('Employee ID is required'),
  documentType: z.enum(['LICENSE', 'CERTIFICATION', 'VISA', 'WORK_PERMIT', 'MEDICAL_CERTIFICATE', 'BACKGROUND_CHECK', 'OTHER']),
  name: z.string().min(1, 'Document name is required').max(200),
  issueDate: z.string().optional(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  alertDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).optional(),
  documentId: z.number().int().positive().optional(),
});

export const updateExpiryDocumentSchema = z.object({
  documentType: z.enum(['LICENSE', 'CERTIFICATION', 'VISA', 'WORK_PERMIT', 'MEDICAL_CERTIFICATE', 'BACKGROUND_CHECK', 'OTHER']).optional(),
  name: z.string().min(1).max(200).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  alertDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED']).optional(),
});
