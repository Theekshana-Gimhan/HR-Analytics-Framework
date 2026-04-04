import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { sendEmail } from '../services/email.service';
import { passwordResetTemplate } from '../templates/email-templates';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { CustomRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Verify JWT_SECRET is set when actually needed
  if (!JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const user = await authService.login(email, password);

    if (!user) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign({ id: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token (long-lived)
    const refreshToken = await authService.generateRefreshToken(user.id);

    logger.info(`User logged in successfully: ${user.email} (${user.role})`, {
      companyId: user.companyId,
      user,
    });

    res.json({
      token: accessToken, // Backwards compatibility for legacy clients
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
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

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  // Verify JWT_SECRET is set when actually needed
  if (!JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    // Validate refresh token
    const user = await authService.validateRefreshToken(refreshToken);

    if (!user) {
      logger.warn('Invalid or expired refresh token attempt');
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ id: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Implement refresh token rotation: issue new refresh token and revoke old one
    const newRefreshToken = await authService.generateRefreshToken(user.id);
    await authService.revokeRefreshToken(refreshToken);

    logger.info(`Access token refreshed for user: ${user.email} (token rotation applied)`);

    res.json({
      accessToken,
      refreshToken: newRefreshToken, // Return new refresh token
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await authService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employee?.id ?? null,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  try {
    // Revoke the refresh token
    const success = await authService.revokeRefreshToken(refreshToken);

    if (!success) {
      return res.status(404).json({ message: 'Refresh token not found' });
    }

    logger.info('User logged out successfully');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Revoke all refresh tokens for the user
    await authService.revokeAllUserTokens(req.user.id);

    logger.info(`All sessions revoked for user: ${req.user.id}`);
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    const token = await authService.generatePasswordResetToken(email);

    // Always return success to prevent email enumeration attacks
    if (token) {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      // Send password reset email
      await sendEmail({
        to: email,
        subject: 'Reset Your Simpala HR Password',
        html: passwordResetTemplate(resetUrl, email),
      });

      logger.info(`Password reset email sent to: ${email}`);
    }

    // Always return same response for security
    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const success = await authService.resetPassword(token, newPassword);

    if (!success) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    logger.info('Password reset successfully');
    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
};
