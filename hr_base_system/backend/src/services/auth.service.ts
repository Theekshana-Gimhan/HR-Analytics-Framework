import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../utils/logger';
import { prisma } from '../prismaClient';

// Refresh token expires in 7 days
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return null;
  }

  if (!user.isActive) {
    return null;
  }

  // Ensure companyId is explicitly included in the returned object
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    password_hash: user.password_hash,
    companyId: user.companyId,
  };
};

export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
      employee: { select: { id: true } },
    },
  });

  return user;
};

export const generateRefreshToken = async (userId: number): Promise<string> => {
  // Generate a secure random token
  const token = crypto.randomBytes(64).toString('hex');

  // Calculate expiry date
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  // Store in database
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

export const validateRefreshToken = async (token: string) => {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken) {
    return null;
  }

  // Check if token is expired
  if (refreshToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });
    return null;
  }

  return refreshToken.user;
};

export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    // Use deleteMany to avoid throwing when the token doesn't exist
    const result = await prisma.refreshToken.deleteMany({
      where: { token },
    });
    // Return true only if a token was actually deleted
    return result.count > 0;
  } catch (error) {
    logger.error('Failed to revoke refresh token', {
      error: error instanceof Error ? error.message : error,
      token,
    });
    return false;
  }
};

export const revokeAllUserTokens = async (userId: number): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};

export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
};

// Password Reset Token expires in 1 hour
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

export const generatePasswordResetToken = async (email: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    logger.info('Password reset requested for non-existent email', { email });
    return null;
  }

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiry date
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

  // Invalidate any existing reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Store new token in database
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  logger.info('Password reset token generated', { userId: user.id });
  return token;
};

export const validatePasswordResetToken = async (token: string): Promise<{ userId: number } | null> => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return null;
  }

  // Check if token is expired or already used
  if (resetToken.expiresAt < new Date() || resetToken.used) {
    return null;
  }

  return { userId: resetToken.userId };
};

export const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
  const tokenData = await validatePasswordResetToken(token);

  if (!tokenData) {
    return false;
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await prisma.user.update({
    where: { id: tokenData.userId },
    data: { password_hash: hashedPassword },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  // Revoke all refresh tokens for security
  await revokeAllUserTokens(tokenData.userId);

  logger.info('Password reset successful', { userId: tokenData.userId });
  return true;
};
