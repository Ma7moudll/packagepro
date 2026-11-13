import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { authService } from './auth.service';
import { prisma } from '../../lib/prisma';

// register() fires real SMTP through a dummy credential (sendEmail rethrows)
// → tests intermittently cross their 5s timeout under full-suite parallelism.
// No test here asserts on mail content — mocked for determinism (4b found;
// identical fix to auth.login.test.ts; the class export keeps AuthEmailService
// importable at module-init time).
vi.mock('../../services/email/email.service', () => ({
  EmailService: class {
    async sendEmail() {}
  },
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

const TEST_EMAILS = [
  'test@example.com',
  'test2@example.com',
  'duplicate@example.com',
  'login@example.com',
];

async function deleteTestUsers() {
  await prisma.user.deleteMany({
    where: { email: { in: TEST_EMAILS } },
  });
}

describe('AuthService', () => {
  beforeEach(async () => {
    await deleteTestUsers();
  });

  afterAll(async () => {
    await deleteTestUsers();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'CUSTOMER',
      });

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result.email).toBe('test@example.com');
      expect(result.message).toContain('Registration successful');
    });

    it('should hash password correctly', async () => {
      const result = await authService.register({
        email: 'test2@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'CUSTOMER',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'test2@example.com' },
      });

      expect(user?.passwordHash).not.toBe('password123');
      expect(user?.passwordHash).toHaveLength(60); // bcrypt hash length
      expect(result.userId).toBe(user?.id);
    });

    it('should not register duplicate email', async () => {
      await authService.register({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'CUSTOMER',
      });

      await expect(
        authService.register({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'CUSTOMER',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await deleteTestUsers();
      await authService.register({
        email: 'login@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'CUSTOMER',
      });
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('login@example.com');
    });

    it('should not login with incorrect password', async () => {
      await expect(
        authService.login({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('should not login with non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });
  });
});

