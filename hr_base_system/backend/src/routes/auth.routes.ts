import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateRequest, validateParams } from '../middleware/validation.middleware';
import { loginSchema, refreshTokenSchema, logoutSchema, forgotPasswordSchema, resetPasswordSchema, webauthnRegisterVerifySchema, webauthnAuthenticateVerifySchema, webauthnCredentialIdParamsSchema } from '../schemas/validation.schemas';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user with email and password, returns JWT access token and refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@simpala.lk
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
 *                 expiresIn:
 *                   type: integer
 *                   example: 900
 *                   description: Access token expiry in seconds (15 minutes)
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/login', validateRequest(loginSchema), authController.login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Get new access token using refresh token. Implements token rotation - returns new refresh token and invalidates old one.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4...
 *                   description: New refresh token (old one is now invalid)
 *                 expiresIn:
 *                   type: integer
 *                   example: 900
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshAccessToken);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout (revoke refresh token)
 *     description: Revoke a specific refresh token, preventing further use
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       404:
 *         description: Refresh token not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', validateRequest(logoutSchema), authController.logout);

/**
 * @openapi
 * /api/v1/auth/logout-all:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for the authenticated user
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All sessions logged out successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: Returns the authenticated user's basic profile info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Send password reset request. Always returns success to prevent email enumeration.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@simpala.lk
 *     responses:
 *       200:
 *         description: Request processed (always returns success for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account exists with this email, a password reset link has been sent.
 */
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password using token
 *     description: Reset user password using a valid reset token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123def456...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully.
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

// ===========================================
// WebAuthn (Passkey/Biometric) Routes - M1.5.2
// ===========================================
import * as webauthnController from '../controllers/webauthn.controller';

/**
 * @openapi
 * /api/v1/auth/webauthn/register/options:
 *   get:
 *     tags:
 *       - WebAuthn
 *     summary: Get WebAuthn registration options
 *     description: Generates options for registering a new passkey/biometric authenticator
 *     responses:
 *       200:
 *         description: Registration options generated successfully
 *       401:
 *         description: Authentication required
 */
router.get('/webauthn/register/options', authenticate, webauthnController.getRegistrationOptions);

/**
 * @openapi
 * /api/v1/auth/webauthn/register/verify:
 *   post:
 *     tags:
 *       - WebAuthn
 *     summary: Verify WebAuthn registration
 *     description: Verifies the registration response and stores the new authenticator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: object
 *               friendlyName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Passkey registered successfully
 *       400:
 *         description: Registration failed
 *       401:
 *         description: Authentication required
 */
router.post('/webauthn/register/verify', authenticate, validateRequest(webauthnRegisterVerifySchema), webauthnController.verifyRegistration);

/**
 * @openapi
 * /api/v1/auth/webauthn/authenticate/options:
 *   get:
 *     tags:
 *       - WebAuthn
 *     summary: Get WebAuthn authentication options
 *     description: Generates options for authenticating with a passkey
 *     security: []
 *     responses:
 *       200:
 *         description: Authentication options generated successfully
 */
router.get('/webauthn/authenticate/options', webauthnController.getAuthenticationOptions);

/**
 * @openapi
 * /api/v1/auth/webauthn/authenticate/verify:
 *   post:
 *     tags:
 *       - WebAuthn
 *     summary: Verify WebAuthn authentication
 *     description: Verifies the authentication response and issues tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: object
 *     responses:
 *       200:
 *         description: Authentication successful, returns tokens
 *       401:
 *         description: Authentication failed
 */
router.post('/webauthn/authenticate/verify', validateRequest(webauthnAuthenticateVerifySchema), webauthnController.verifyAuthentication);

/**
 * @openapi
 * /api/v1/auth/webauthn/credentials:
 *   get:
 *     tags:
 *       - WebAuthn
 *     summary: List registered passkeys
 *     description: Lists all registered authenticators for the current user
 *     responses:
 *       200:
 *         description: List of credentials
 *       401:
 *         description: Authentication required
 */
router.get('/webauthn/credentials', authenticate, webauthnController.listCredentials);

/**
 * @openapi
 * /api/v1/auth/webauthn/credentials/{id}:
 *   delete:
 *     tags:
 *       - WebAuthn
 *     summary: Delete a passkey
 *     description: Deletes a registered authenticator
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Credential deleted successfully
 *       404:
 *         description: Credential not found
 *       401:
 *         description: Authentication required
 */
router.delete('/webauthn/credentials/:id', authenticate, validateParams(webauthnCredentialIdParamsSchema), webauthnController.deleteCredential);

export default router;

