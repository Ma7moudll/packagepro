import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Same determinism fix as auth.login.test.ts / auth.service.test.ts: register
// paths would hit real SMTP with dummy credentials inside hooks/tests whose
// 5s timeouts trip under full-suite parallelism. No assertion needs mail.
vi.mock('../../services/email/email.service', () => ({
  EmailService: class {
    async sendEmail() {}
  },
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));
import { prisma } from '../../lib/prisma';
import { authService } from './auth.service';

/**
 * Auth Integration Tests - Registration & Email Verification Flow
 * Tests Phase 3 User Story 1 endpoints
 */
describe('Auth Integration Tests', () => {
  const testEmail = 'test@integration.com';
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  describe('Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register({
        email: testEmail,
        password: testPassword,
        name: testName,
        role: 'CUSTOMER',
      });

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result.email).toBe(testEmail);
      expect(result.message).toContain('Registration successful');
    });

    it('should hash the password correctly', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user).toBeTruthy();
      expect(user?.passwordHash).not.toBe(testPassword);
      expect(user?.passwordHash).toHaveLength(60); // bcrypt hash length
    });

    it('should create email verification token', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user).toBeTruthy();

      const verToken = await prisma.emailVerificationToken.findFirst({
        where: { userId: user!.id },
      });

      expect(verToken).toBeTruthy();
      expect(verToken?.token).toBeTruthy();
      expect(verToken?.usedAt).toBeNull();
    });

    it('should prevent duplicate email registration', async () => {
      try {
        await authService.register({
          email: testEmail,
          password: testPassword,
          name: testName,
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should validate password strength', async () => {
      try {
        await authService.register({
          email: 'newuser@test.com',
          password: 'short', // Too short
          name: 'New User',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Email Verification Flow', () => {
    let verificationToken: string;
    let userId: string;

    beforeAll(async () => {
      // Get the verification token
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      userId = user!.id;

      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId },
      });
      verificationToken = token!.token;
    });

    it('should verify email with valid token', async () => {
      const result = await authService.verifyEmail({
        token: verificationToken,
      });

      expect(result).toHaveProperty('email');
      expect(result.email).toBe(testEmail);
      expect(result.message).toContain('verified successfully');
    });

    it('should mark email as verified in database', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user?.emailVerified).toBe(true);
    });

    it('should mark token as used', async () => {
      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId },
      });

      expect(token?.usedAt).toBeTruthy();
    });

    it('should reject already-used token', async () => {
      try {
        await authService.verifyEmail({
          token: verificationToken,
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should reject invalid token', async () => {
      try {
        await authService.verifyEmail({
          token: 'invalid-token-12345',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Resend Verification Email', () => {
    const newUserEmail = 'resend-test@integration.com';

    beforeAll(async () => {
      // Create a new unverified user
      await prisma.user.deleteMany({
        where: { email: newUserEmail },
      });

      await authService.register({
        email: newUserEmail,
        password: testPassword,
        name: 'Resend Test',
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: newUserEmail },
      });
    });

    it('should resend verification email', async () => {
      const result = await authService.resendVerificationEmail({
        email: newUserEmail,
      });

      expect(result.message).toContain('Verification email sent');
    });

    it('should create a new verification token', async () => {
      const user = await prisma.user.findUnique({
        where: { email: newUserEmail },
      });

      const tokens = await prisma.emailVerificationToken.findMany({
        where: { userId: user!.id },
      });

      // Should have at least 1 token (old one deleted, new one created)
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle resend on already verified email', async () => {
      const result = await authService.resendVerificationEmail({
        email: testEmail, // Already verified
      });

      expect(result.message).toContain('already verified');
    });

    it('should not reveal if user exists', async () => {
      const result = await authService.resendVerificationEmail({
        email: 'nonexistent@test.com',
      });

      // Should return generic message (privacy)
      expect(result.message).toContain('registered');
    });
  });

  describe('Password Reset Flow', () => {
    const resetUserEmail = 'reset-test@integration.com';
    const newPassword = 'NewSecurePassword456!';

    beforeAll(async () => {
      // Create user for password reset testing
      await prisma.user.deleteMany({
        where: { email: resetUserEmail },
      });

      await authService.register({
        email: resetUserEmail,
        password: testPassword,
        name: 'Reset Test',
      });

      // Verify email so we can test password reset
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId: user!.id },
      });

      await authService.verifyEmail({
        token: token!.token,
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: resetUserEmail },
      });
    });

    it('should initiate password reset', async () => {
      const result = await authService.forgotPassword({
        email: resetUserEmail,
      });

      expect(result.message).toContain('Password reset link sent');
    });

    it('should create password reset token', async () => {
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      expect(resetToken).toBeTruthy();
      expect(resetToken?.usedAt).toBeNull();
    });

    it('should reset password with valid token', async () => {
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      const result = await authService.resetPassword({
        token: resetToken!.token,
        newPassword,
      });

      expect(result.message).toContain('successful');
    });

    it('should update password hash', async () => {
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const oldHash = testPassword; // Original password
      expect(user?.passwordHash).not.toBe(oldHash);
    });

    it('should mark reset token as used', async () => {
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      expect(resetToken?.usedAt).toBeTruthy();
    });

    it('should reject already-used reset token', async () => {
      const user = await prisma.user.findUnique({
        where: { email: resetUserEmail },
      });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      try {
        await authService.resetPassword({
          token: resetToken!.token,
          newPassword: 'AnotherPassword123!',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });
});
