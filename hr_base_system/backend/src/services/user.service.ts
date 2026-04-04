import bcrypt from 'bcrypt';
import { UpdateProfileInput } from '../schemas/user.schema';
import { prisma } from '../prismaClient';
import { BadRequestError } from '../middleware/error.middleware';

/**
 * User Profile Response type
 */
export interface UserProfile {
    id: number;
    email: string;
    role: string;
    companyId: number;
    employee: {
        id: number;
        first_name: string;
        last_name: string;
        job_title: string;
        phone_number: string | null;
        address: string | null;
        date_of_birth: Date | null;
        bank_name: string | null;
        bank_branch: string | null;
        account_number: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
    } | null;
}

/**
 * Get user profile with employee details
 */
export const getProfile = async (userId: number): Promise<UserProfile | null> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            employee: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    job_title: true,
                    phone_number: true,
                    address: true,
                    date_of_birth: true,
                    bank_name: true,
                    bank_branch: true,
                    account_number: true,
                    emergency_contact_name: true,
                    emergency_contact_phone: true,
                },
            },
        },
    });

    return user;
};

/**
 * Update user profile (employee fields only)
 * Users cannot update their own email or role
 */
export const updateProfile = async (
    userId: number,
    data: UpdateProfileInput
): Promise<UserProfile | null> => {
    // Get user's employee record
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
    });

    if (!user || !user.employee) {
        return null;
    }

    // Update employee record with provided fields
    await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
            phone_number: data.phone_number ?? user.employee.phone_number,
            address: data.address ?? user.employee.address,
            date_of_birth: data.date_of_birth ?? user.employee.date_of_birth,
            bank_name: data.bank_name ?? user.employee.bank_name,
            bank_branch: data.bank_branch ?? user.employee.bank_branch,
            account_number: data.account_number ?? user.employee.account_number,
            emergency_contact_name: data.emergency_contact_name ?? user.employee.emergency_contact_name,
            emergency_contact_phone: data.emergency_contact_phone ?? user.employee.emergency_contact_phone,
        },
    });

    // Return updated profile
    return getProfile(userId);
};

/**
 * Change user password
 * Validates current password before allowing change
 * Revokes all refresh tokens for security
 */
export const changePassword = async (
    userId: number,
    currentPassword: string,
    newPassword: string
): Promise<boolean> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password_hash: true },
    });

    if (!user) {
        return false;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new BadRequestError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and revoke all refresh tokens in a transaction
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { password_hash: newPasswordHash },
        }),
        prisma.refreshToken.deleteMany({
            where: { userId },
        }),
    ]);

    return true;
};

// =============================================
// Admin User Management
// =============================================

import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import { Role, Prisma } from '@prisma/client';

/**
 * Create a new user (Admin)
 */
export const createUser = async (data: CreateUserInput) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw new BadRequestError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
        data: {
            email: data.email,
            password_hash: hashedPassword,
            role: data.role as Role,
            companyId: data.companyId,
            ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
            isActive: true,
        },
    });

    return user;
};

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (
    page = 1,
    limit = 20,
    companyId: number,
    query?: string
) => {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
        companyId,
    };

    if (query) {
        where.OR = [
            { email: { contains: query, mode: 'insensitive' } },
            { employee: { first_name: { contains: query, mode: 'insensitive' } } },
            { employee: { last_name: { contains: query, mode: 'insensitive' } } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true, // Need to select this
                companyId: true,
                employee: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: { id: 'asc' },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        items: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

/**
 * Get user by ID (Full details for Admin)
 */
export const getUserById = async (userId: number) => {
    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            employee: true,
        },
    });
};

/**
 * Update user (Admin)
 */
export const updateUser = async (userId: number, data: UpdateUserInput) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            role: data.role as Role,
            isActive: data.isActive,
            email: data.email,
        },
    });
};

/**
 * Delete user (or Deactivate)
 * Using Soft Delete via isActive
 */
export const deleteUser = async (userId: number) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            isActive: false,
        },
    });
};
