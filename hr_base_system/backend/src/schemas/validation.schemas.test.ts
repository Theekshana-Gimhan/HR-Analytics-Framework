import {
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  loginSchema,
  createLeaveTypeSchema,
  generatePayslipSchema,
  generateBankFileSchema,
} from './validation.schemas';

describe('Auth validation schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({ password: 'password123' });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts a valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty email', () => {
      const result = forgotPasswordSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    const validPayload = { token: 'abc123', newPassword: 'StrongP4ss' };

    it('accepts a valid token and strong password', () => {
      const result = resetPasswordSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects empty token', () => {
      const result = resetPasswordSchema.safeParse({ token: '', newPassword: 'StrongP4ss' });
      expect(result.success).toBe(false);
    });

    it('rejects weak password (no uppercase)', () => {
      const result = resetPasswordSchema.safeParse({ token: 'abc', newPassword: 'weakpass1' });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 chars', () => {
      const result = resetPasswordSchema.safeParse({ token: 'abc', newPassword: 'Ab1' });
      expect(result.success).toBe(false);
    });
  });
});

describe('User profile validation schemas', () => {
  describe('updateProfileSchema', () => {
    it('accepts partial profile update with phone', () => {
      const result = updateProfileSchema.safeParse({ phone_number: '+94771234567' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (no updates)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = updateProfileSchema.safeParse({ date_of_birth: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    it('accepts valid ISO date', () => {
      const result = updateProfileSchema.safeParse({ date_of_birth: '1990-05-15' });
      expect(result.success).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid current + new passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'NewStr0ng',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewStr0ng',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Business validation schemas', () => {
  describe('createLeaveTypeSchema', () => {
    it('accepts a valid leave type', () => {
      const result = createLeaveTypeSchema.safeParse({
        name: 'Annual',
        default_balance: 14,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative balance', () => {
      const result = createLeaveTypeSchema.safeParse({
        name: 'Sick',
        default_balance: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generatePayslipSchema', () => {
    it('accepts valid month/year/employeeId', () => {
      const result = generatePayslipSchema.safeParse({
        month: 6,
        year: 2025,
        employeeId: 1,
      });
      expect(result.success).toBe(true);
    });

    it('rejects month out of range', () => {
      const result = generatePayslipSchema.safeParse({
        month: 13,
        year: 2025,
        employeeId: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generateBankFileSchema', () => {
    it('accepts CIPS file type', () => {
      const result = generateBankFileSchema.safeParse({
        month: 6,
        year: 2025,
        fileType: 'CIPS',
      });
      expect(result.success).toBe(true);
    });

    it('accepts SLIPS file type', () => {
      const result = generateBankFileSchema.safeParse({
        month: 6,
        year: 2025,
        fileType: 'SLIPS',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid file type', () => {
      const result = generateBankFileSchema.safeParse({
        month: 6,
        year: 2025,
        fileType: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });
});
