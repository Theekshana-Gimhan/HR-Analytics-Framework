import { z } from 'zod';

/**
 * Schema for updating user profile
 * Only allows updating employee-related fields, not role/email
 */
export const UpdateProfileSchema = z.object({
    phone_number: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    date_of_birth: z.coerce.date().optional(),
    bank_name: z.string().max(100).optional(),
    bank_branch: z.string().max(100).optional(),
    account_number: z.string().max(50).optional(),
    emergency_contact_name: z.string().max(100).optional(),
    emergency_contact_phone: z.string().max(20).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Schema for changing password
 */
export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/**
 * Schema for creating a new user (Admin only)
 */
export const CreateUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['OWNER', 'ADMIN', 'EMPLOYEE']),
    employeeId: z.number().int().optional(),
    companyId: z.number().int().positive('Company ID is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Schema for updating a user (Admin only)
 */
export const UpdateUserSchema = z.object({
    role: z.enum(['OWNER', 'ADMIN', 'EMPLOYEE']).optional(),
    isActive: z.boolean().optional(),
    email: z.string().email('Invalid email address').optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
