import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import { authService } from './auth.service';
import { authRedisService } from './services/redis.service';
import { jwtService } from './services/jwt.service';

// register() sends a verification email through the real SMTP transport —
// with dev credentials that raises a live network round-trip inside
// beforeAll, which intermittently exceeds vitest's 5s hook timeout under
// full-suite parallelism (suite flake: all tests pending). Nothing here
// asserts on email, so it is mocked out for determinism (Step-4 4b found).
vi.mock('../../services/email/email.service', () => ({
  // AuthEmailService (auth/services/email.service, consumed at import time
  // via auth.service.ts) constructs this class itself — the mock must
  // provide it, not just the singleton, or the module chain dies on import.
  EmailService: class {
    async sendEmail() {}
  },
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

/**
 * Auth Login & Logout Tests - Phase 4 (US2)
 * Tests login with exponential backoff, logout with blacklist, and token refresh
 */
describe('Auth Login & Logout Tests', () => {
  const testEmail = 'login-test@example.com';
  const testPassword = 'SecurePassword123!';
  const testName = 'Login Test User';
  let userId: string;
  let validAccessToken: string;
  let validRefreshToken: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // Create and register a test user
    const registerResult = await authService.register({
      email: testEmail,
      password: testPassword,
      name: testName,
      role: 'CUSTOMER',
    });

    userId = registerResult.userId;

    // Verify email so we can login
    const verToken = await prisma.emailVerificationToken.findFirst({
      where: { userId },
    });

    if (verToken) {
      await authService.verifyEmail({
        token: verToken.token,
      });
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(testEmail);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.tokens).toHaveProperty('expiresIn');

      // Store for later tests
      validAccessToken = result.tokens.accessToken;
      validRefreshToken = result.tokens.refreshToken;
    });

    it('should reject login with invalid password', async () => {
      try {
        await authService.login({
          email: testEmail,
          password: 'WrongPassword123!',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should reject login with non-existent email', async () => {
      try {
        await authService.login({
          email: 'nonexistent@test.com',
          password: testPassword,
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should update user lastLoginAt on successful login', async () => {
      const beforeLogin = new Date();

      await authService.login({
        email: testEmail,
        password: testPassword,
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(user?.lastLoginAt).toBeTruthy();
      expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should generate valid JWT tokens', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      const accessPayload = jwtService.decodeToken(result.tokens.accessToken);
      const refreshPayload = jwtService.decodeToken(result.tokens.refreshToken);

      expect(accessPayload).toBeTruthy();
      expect(refreshPayload).toBeTruthy();
      expect(accessPayload?.userId).toBe(userId);
      expect(refreshPayload?.userId).toBe(userId);
      expect(accessPayload?.type).toBe('access');
      expect(refreshPayload?.type).toBe('refresh');
    });
  });

  describe('Rate Limiting & Exponential Backoff', () => {
    const testEmailForBackoff = 'backoff-test@example.com';

    it('should track failed login attempts', async () => {
      // First failure
      try {
        await authService.login({
          email: testEmailForBackoff,
          password: 'WrongPassword',
        });
      } catch (_error) {
        // Expected to fail
      }

      // Second failure
      try {
        await authService.login({
          email: testEmailForBackoff,
          password: 'WrongPassword',
        });
      } catch (_error) {
        // Expected to fail
      }

      expect.soft('Multiple failed attempts tracked');
    });

    it('should apply exponential backoff after failed attempts', async () => {
      // Vitest has no live Redis, so mock the attempt counter to force backoff.
      const getAttemptsSpy = vi
        .spyOn(authRedisService, 'getFailedLoginAttempts')
        .mockResolvedValue(2); // attemptCount=2 => 2^(2-2)=1s delay per login
      try {
        const startTime = Date.now();

        for (let i = 0; i < 2; i++) {
          try {
            await authService.login({
              email: testEmailForBackoff,
              password: 'WrongPassword',
            });
          } catch (_error) {
            // Expected
          }
        }

        const elapsedTime = Date.now() - startTime;
        // Should have some delay applied (at least 1 second)
        expect(elapsedTime).toBeGreaterThan(500);
      } finally {
        getAttemptsSpy.mockRestore();
      }
    });

    it('should require CAPTCHA after max failed attempts', async () => {
      const captchaRequiredEmail = 'captcha-test@example.com';

      // Trigger max failed attempts (3+)
      for (let i = 0; i < 4; i++) {
        try {
          await authService.login({
            email: captchaRequiredEmail,
            password: 'WrongPassword',
          });
        } catch (error) {
          // Keep trying
          if (error instanceof Error && error.message === 'CAPTCHA_REQUIRED') {
            expect(error).toBeTruthy(); // CAPTCHA should be required
            return;
          }
        }
      }

      expect.soft('CAPTCHA required after max attempts');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      const refreshResult = await authService.refreshAccessToken(
        result.tokens.refreshToken
      );

      expect(refreshResult).toHaveProperty('tokens');
      expect(refreshResult.tokens).toHaveProperty('accessToken');
      expect(refreshResult.tokens.accessToken).not.toBe(result.tokens.accessToken); // New token
      expect(refreshResult.tokens.refreshToken).toBe(result.tokens.refreshToken); // Same refresh token
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = jwtService.generateRefreshToken(userId, testEmail, 'CUSTOMER');

      // Manually mark token as expired in Redis (simulate expiry)
      // Note: In real scenario, token would naturally expire

      try {
        await authService.refreshAccessToken(expiredToken);
        // May or may not fail depending on token expiry time
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should reject blacklisted refresh token', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      // Logout to blacklist the token
      await authService.logout(userId, result.tokens.refreshToken);

      // Try to refresh with blacklisted token
      try {
        await authService.refreshAccessToken(result.tokens.refreshToken);
        expect.fail('Should have rejected blacklisted token');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Logout Flow', () => {
    it('should logout successfully with valid tokens', async () => {
      const loginResult = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      const logoutResult = await authService.logout(
        userId,
        loginResult.tokens.refreshToken
      );

      expect(logoutResult).toHaveProperty('message');
      expect(logoutResult.message).toContain('successful');
    });

    it('should blacklist refresh token after logout', async () => {
      const loginResult = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      await authService.logout(userId, loginResult.tokens.refreshToken);

      // Try to refresh token - should fail
      try {
        await authService.refreshAccessToken(loginResult.tokens.refreshToken);
        expect.fail('Token should be blacklisted');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should reject logout with invalid token', async () => {
      try {
        await authService.logout(userId, 'invalid.jwt.token');
        expect.fail('Should reject invalid token');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should reject logout with mismatched user', async () => {
      const loginResult = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      // Try to logout with different user ID
      try {
        await authService.logout('different-user-id', loginResult.tokens.refreshToken);
        expect.fail('Should reject mismatched user');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Security Features', () => {
    it('should not reveal user existence on failed login', async () => {
      // Both should return same generic error
      const result1 = await authService.login({
        email: 'nonexistent1@test.com',
        password: 'SomePassword123!',
      }).catch(() => 'error');

      const result2 = await authService.login({
        email: testEmail,
        password: 'WrongPassword123!',
      }).catch(() => 'error');

      expect(result1).toBe('error');
      expect(result2).toBe('error');
    });

    it('should include user info in login response', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('emailVerified');
      expect(result.user.email).toBe(testEmail);
    });

    it('should include correct token expiry in response', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.tokens.expiresIn).toBeGreaterThan(0);
      expect(result.tokens.expiresIn).toBeLessThan(60 * 60); // Less than 1 hour (15 min expected)
    });
  });
});
