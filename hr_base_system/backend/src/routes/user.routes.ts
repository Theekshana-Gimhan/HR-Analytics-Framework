import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { updateProfileSchema, changePasswordSchema } from '../schemas/validation.schemas';
import * as userController from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', checkPermission(Permission.EMPLOYEE_VIEW_SELF), userController.getProfile);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               bank_name:
 *                 type: string
 *               bank_branch:
 *                 type: string
 *               account_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', checkPermission(Permission.EMPLOYEE_VIEW_SELF), validateRequest(updateProfileSchema), userController.updateProfile);

/**
 * @swagger
 * /api/v1/users/me/change-password:
 *   post:
 *     summary: Change current user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 1
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password incorrect or unauthorized
 */
router.post('/me/change-password', checkPermission(Permission.EMPLOYEE_VIEW_SELF), validateRequest(changePasswordSchema), userController.changePassword);

// =============================================
// Admin Routes
// =============================================

import { CreateUserSchema, UpdateUserSchema } from '../schemas/user.schema';

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user (Admin)
 */
router.post('/', checkPermission(Permission.USER_MANAGE), validateRequest(CreateUserSchema), userController.createUser);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List users (Admin)
 */
router.get('/', checkPermission(Permission.USER_MANAGE), userController.getAllUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 */
router.get('/:id', checkPermission(Permission.USER_MANAGE), userController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Update user (Admin)
 */
router.patch('/:id', checkPermission(Permission.USER_MANAGE), validateRequest(UpdateUserSchema), userController.updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Deactivate user (Admin)
 */
router.delete('/:id', checkPermission(Permission.USER_MANAGE), userController.deleteUser);

export default router;
