import { Request, Response, NextFunction } from 'express';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import * as webauthnService from '../services/webauthn.service';
import { CustomRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';
const ACCESS_TOKEN_EXPIRY = '15m';

/**
 * GET /auth/webauthn/register/options
 * Generates registration options for the authenticated user.
 */
export const getRegistrationOptions = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Fetch user email from database since CustomRequest.user doesn't include it
        const { prisma } = await import('../prismaClient');
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true },
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const options = await webauthnService.getRegistrationOptions(req.user.id, user.email);
        res.json(options);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /auth/webauthn/register/verify
 * Verifies the registration response and stores the authenticator.
 */
export const verifyRegistration = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { response, friendlyName } = req.body as {
            response: RegistrationResponseJSON;
            friendlyName?: string;
        };

        if (!response) {
            return res.status(400).json({ message: 'Registration response is required' });
        }

        const result = await webauthnService.verifyAndSaveRegistration(
            req.user.id,
            response,
            friendlyName
        );

        if (!result.verified) {
            return res.status(400).json({ message: result.error || 'Registration failed' });
        }

        logger.info(`WebAuthn passkey registered for user ${req.user.id}`);
        res.json({ success: true, message: 'Passkey registered successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /auth/webauthn/authenticate/options
 * Generates authentication options. Can be used with or without a prior login.
 */
export const getAuthenticationOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Optional: if user is already authenticated, we can limit to their credentials
        const customReq = req as CustomRequest;
        const userId = customReq.user?.id;

        const options = await webauthnService.getAuthenticationOptions(userId);
        res.json(options);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /auth/webauthn/authenticate/verify
 * Verifies the authentication response and issues tokens.
 */
export const verifyAuthentication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { response } = req.body as { response: AuthenticationResponseJSON };

        if (!response) {
            return res.status(400).json({ message: 'Authentication response is required' });
        }

        const result = await webauthnService.verifyAuthentication(response);

        if (!result.verified || !result.userId) {
            return res.status(401).json({ message: result.error || 'Authentication failed' });
        }

        // Fetch user details for token
        const { prisma } = await import('../prismaClient');
        const user = await prisma.user.findUnique({
            where: { id: result.userId },
            select: { id: true, email: true, role: true, companyId: true },
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Generate tokens (same as regular login)
        const accessToken = jwt.sign(
            { id: user.id, role: user.role, companyId: user.companyId },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Import auth service for refresh token generation
        const authService = await import('../services/auth.service');
        const refreshToken = await authService.generateRefreshToken(user.id);

        logger.info(`WebAuthn login successful for user ${user.email}`);

        res.json({
            token: accessToken,
            accessToken,
            refreshToken,
            expiresIn: 900,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /auth/webauthn/credentials
 * Lists all registered authenticators for the current user.
 */
export const listCredentials = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const authenticators = await webauthnService.getUserAuthenticators(req.user.id);
        res.json({ credentials: authenticators });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /auth/webauthn/credentials/:id
 * Deletes an authenticator.
 */
export const deleteCredential = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const authenticatorId = parseInt(req.params.id, 10);
        if (isNaN(authenticatorId)) {
            return res.status(400).json({ message: 'Invalid credential ID' });
        }

        const deleted = await webauthnService.deleteAuthenticator(req.user.id, authenticatorId);

        if (!deleted) {
            return res.status(404).json({ message: 'Credential not found' });
        }

        logger.info(`WebAuthn credential ${authenticatorId} deleted for user ${req.user.id}`);
        res.json({ success: true, message: 'Credential deleted successfully' });
    } catch (error) {
        next(error);
    }
};
