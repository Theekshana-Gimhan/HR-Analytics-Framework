import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { UpdateProfileSchema, ChangePasswordSchema } from '../schemas/user.schema';
import { CustomRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Format Zod errors for API response
 */
const formatZodErrors = (error: ZodError) => {
    return error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
};

/**
 * Get current user's profile
 * GET /api/v1/users/me
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as CustomRequest;
        if (!customReq.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const profile = await userService.getProfile(customReq.user.id);

        if (!profile) {
            return res.status(404).json({ message: 'User not found' });
        }

        logger.info(`Profile retrieved for user: ${customReq.user.id}`);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

/**
 * Update current user's profile
 * PATCH /api/v1/users/me
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as CustomRequest;
        if (!customReq.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Validate input
        const validatedData = UpdateProfileSchema.parse(req.body);

        const updatedProfile = await userService.updateProfile(customReq.user.id, validatedData);

        if (!updatedProfile) {
            return res.status(404).json({ message: 'User or employee record not found' });
        }

        logger.info(`Profile updated for user: ${customReq.user.id}`);
        res.json(updatedProfile);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: formatZodErrors(error),
            });
        }
        next(error);
    }
};

/**
 * Change current user's password
 * POST /api/v1/users/me/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as CustomRequest;
        if (!customReq.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Validate input
        const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

        await userService.changePassword(customReq.user.id, currentPassword, newPassword);

        logger.info(`Password changed for user: ${customReq.user.id}`);
        res.json({ message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: formatZodErrors(error),
            });
        }
        if (error instanceof Error && error.message === 'Current password is incorrect') {
            return res.status(401).json({ message: error.message });
        }
        next(error);
    }
};

// =============================================
// Admin User Management
// =============================================

import { CreateUserSchema, UpdateUserSchema } from '../schemas/user.schema';

/**
 * Create a new user (Admin)
 * POST /api/v1/users
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as CustomRequest;
        if (!customReq.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const validatedData = CreateUserSchema.parse(req.body);

        const newUser = await userService.createUser(validatedData);

        logger.info(`User created by admin ${customReq.user.id}: ${newUser.email}`);
        res.status(201).json(newUser);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: formatZodErrors(error),
            });
        }
        // Check for specific service errors (e.g. duplicate email)
        if (error instanceof Error && error.message.includes('already exists')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * Get all users
 * GET /api/v1/users
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as CustomRequest;
        if (!customReq.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const query = req.query.query as string;
        const companyId = customReq.user.companyId;

        const result = await userService.getAllUsers(page, limit, companyId, query);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await userService.getUserById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security check: Ensure user belongs to the same company?
        // Admin should only see users in their company.
        // User schema has companyId.
        const customReq = req as CustomRequest;
        if (user.companyId !== customReq.user?.companyId && (customReq.user?.role as string) !== 'OWNER') {
            // If multi-tenant, strictly enforce.
            // For now, assuming standard checks.
            // If user is accessing a user from another company, 404 or 403.
            // But existing getProfile doesn't check company because it's "me".
            // Here we should check.
            if ((customReq.user?.role as string) !== 'OWNER') { // Owner might see all? Or strictly company?
                // Let's enforce company check for ADMIN/EMPLOYEE.
                // Actually logic is: Admin manages THEIR company users.
                if (user.companyId !== customReq.user?.companyId) {
                    return res.status(404).json({ message: 'User not found' });
                }
            }
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * Update user
 * PATCH /api/v1/users/:id
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = parseInt(req.params.id);
        const validatedData = UpdateUserSchema.parse(req.body);

        // Security: Check if target user exists and belongs to company
        const existingUser = await userService.getUserById(userId);
        const customReq = req as CustomRequest;

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (existingUser.companyId !== customReq.user?.companyId && (customReq.user?.role as string) !== 'OWNER') {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = await userService.updateUser(userId, validatedData);

        logger.info(`User updated by admin ${customReq.user?.id}: ${userId}`);
        res.json(updatedUser);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: formatZodErrors(error),
            });
        }
        next(error);
    }
};

/**
 * Delete user (Deactivate)
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = parseInt(req.params.id);

        // Security check
        const existingUser = await userService.getUserById(userId);
        const customReq = req as CustomRequest;

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (existingUser.companyId !== customReq.user?.companyId && (customReq.user?.role as string) !== 'OWNER') {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting yourself
        if (userId === customReq.user?.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await userService.deleteUser(userId);

        logger.info(`User deactivated by admin ${customReq.user?.id}: ${userId}`);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
