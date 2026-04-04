import bcrypt from 'bcrypt';

import {
  login,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  generatePasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
} from './auth.service';
import { prisma } from '../prismaClient';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('../prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: logger,
  };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 1,
  email: 'admin@simpala.lk',
  role: 'ADMIN',
  password_hash: '$2b$10$hashedpassword',
  companyId: 1,
  isActive: true,
  name: 'Admin User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // =======================================================================
  // login
  // =======================================================================
  describe('login', () => {
    it('returns user data when email and password are correct', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const user = { ...MOCK_USER, password_hash: hashedPassword };
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await login('admin@simpala.lk', 'correctPassword');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.email).toBe('admin@simpala.lk');
      expect(result!.role).toBe('ADMIN');
      expect(result!.companyId).toBe(1);
    });

    it('returns null when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await login('nonexistent@simpala.lk', 'password');

      expect(result).toBeNull();
    });

    it('returns null when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const user = { ...MOCK_USER, password_hash: hashedPassword };
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await login('admin@simpala.lk', 'wrongPassword');

      expect(result).toBeNull();
    });

    it('includes companyId in the returned object', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = { ...MOCK_USER, password_hash: hashedPassword, companyId: 5 };
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await login('admin@simpala.lk', 'password123');

      expect(result).toHaveProperty('companyId', 5);
    });
  });

  // =======================================================================
  // generateRefreshToken
  // =======================================================================
  describe('generateRefreshToken', () => {
    it('creates a refresh token in the database and returns the token string', async () => {
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 1 });

      const token = await generateRefreshToken(1);

      expect(typeof token).toBe('string');
      expect(token.length).toBe(128); // 64 bytes hex = 128 chars
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token,
            userId: 1,
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('sets expiry to 7 days from now', async () => {
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 1 });

      const before = Date.now();
      await generateRefreshToken(1);
      const after = Date.now();

      const createCall = (mockPrisma.refreshToken.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDays - 100);
      expect(expiresAt).toBeLessThanOrEqual(after + sevenDays + 100);
    });
  });

  // =======================================================================
  // validateRefreshToken
  // =======================================================================
  describe('validateRefreshToken', () => {
    it('returns the user when token is valid and not expired', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        token: 'validtoken',
        expiresAt: futureDate,
        user: MOCK_USER,
      });

      const result = await validateRefreshToken('validtoken');

      expect(result).toEqual(MOCK_USER);
    });

    it('returns null when token does not exist', async () => {
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateRefreshToken('nonexistent');

      expect(result).toBeNull();
    });

    it('returns null and deletes the token when expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 99,
        token: 'expiredtoken',
        expiresAt: pastDate,
        user: MOCK_USER,
      });
      (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      const result = await validateRefreshToken('expiredtoken');

      expect(result).toBeNull();
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });
  });

  // =======================================================================
  // revokeRefreshToken
  // =======================================================================
  describe('revokeRefreshToken', () => {
    it('returns true when a token is successfully revoked', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await revokeRefreshToken('tokenToRevoke');

      expect(result).toBe(true);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'tokenToRevoke' },
      });
    });

    it('returns false when the token does not exist', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await revokeRefreshToken('nonexistent');

      expect(result).toBe(false);
    });

    it('returns false and logs error on database failure', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await revokeRefreshToken('badtoken');

      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // revokeAllUserTokens
  // =======================================================================
  describe('revokeAllUserTokens', () => {
    it('deletes all refresh tokens for a given user', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await revokeAllUserTokens(1);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });
  });

  // =======================================================================
  // cleanupExpiredTokens
  // =======================================================================
  describe('cleanupExpiredTokens', () => {
    it('deletes expired tokens and returns count', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const count = await cleanupExpiredTokens();

      expect(count).toBe(5);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('returns 0 when no expired tokens exist', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const count = await cleanupExpiredTokens();

      expect(count).toBe(0);
    });
  });

  // =======================================================================
  // generatePasswordResetToken
  // =======================================================================
  describe('generatePasswordResetToken', () => {
    it('generates a reset token for an existing user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
      (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 1 });

      const token = await generatePasswordResetToken('admin@simpala.lk');

      expect(token).not.toBeNull();
      expect(typeof token).toBe('string');
      expect(token!.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('invalidates existing reset tokens before creating a new one', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
      (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 1 });

      await generatePasswordResetToken('admin@simpala.lk');

      expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER.id, used: false },
        data: { used: true },
      });
    });

    it('returns null for a non-existent email (does not reveal existence)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const token = await generatePasswordResetToken('unknown@simpala.lk');

      expect(token).toBeNull();
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('sets expiry to 1 hour from now', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
      (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 1 });

      const before = Date.now();
      await generatePasswordResetToken('admin@simpala.lk');
      const after = Date.now();

      const createCall = (mockPrisma.passwordResetToken.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const oneHour = 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + oneHour - 100);
      expect(expiresAt).toBeLessThanOrEqual(after + oneHour + 100);
    });
  });

  // =======================================================================
  // validatePasswordResetToken
  // =======================================================================
  describe('validatePasswordResetToken', () => {
    it('returns userId when token is valid, not expired, and not used', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'validtoken',
        userId: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
      });

      const result = await validatePasswordResetToken('validtoken');

      expect(result).toEqual({ userId: 1 });
    });

    it('returns null when token does not exist', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validatePasswordResetToken('nonexistent');

      expect(result).toBeNull();
    });

    it('returns null when token is expired', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'expired',
        userId: 1,
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
        used: false,
      });

      const result = await validatePasswordResetToken('expired');

      expect(result).toBeNull();
    });

    it('returns null when token has already been used', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'usedtoken',
        userId: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
      });

      const result = await validatePasswordResetToken('usedtoken');

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // resetPassword
  // =======================================================================
  describe('resetPassword', () => {
    it('resets password and marks token as used on success', async () => {
      // First call is from resetPassword -> validatePasswordResetToken
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'resettoken',
        userId: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(MOCK_USER);
      (mockPrisma.passwordResetToken.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await resetPassword('resettoken', 'newSecurePassword123');

      expect(result).toBe(true);
      // User password updated
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password_hash: expect.any(String) },
      });
      // Token marked as used
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { token: 'resettoken' },
        data: { used: true },
      });
      // Refresh tokens revoked for security
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('hashes the new password with bcrypt before storing', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'resettoken',
        userId: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(MOCK_USER);
      (mockPrisma.passwordResetToken.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await resetPassword('resettoken', 'myNewPassword');

      const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls[0][0];
      const storedHash = updateCall.data.password_hash;
      // Verify the stored hash is a valid bcrypt hash of the new password
      const isValid = await bcrypt.compare('myNewPassword', storedHash);
      expect(isValid).toBe(true);
    });

    it('returns false when token is invalid', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await resetPassword('invalidtoken', 'newPassword');

      expect(result).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('returns false when token is expired', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        token: 'expiredtoken',
        userId: 1,
        expiresAt: new Date(Date.now() - 60 * 1000),
        used: false,
      });

      const result = await resetPassword('expiredtoken', 'newPassword');

      expect(result).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
