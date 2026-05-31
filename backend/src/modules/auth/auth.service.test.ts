import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { prisma } from '../../lib/prisma';

describe('AuthService', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test@',
        },
      },
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('user');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should hash password correctly', async () => {
      const result = await authService.register({
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'test2@example.com' },
      });

      expect(user?.passwordHash).not.toBe('password123');
      expect(user?.passwordHash).toHaveLength(60); // bcrypt hash length
    });

    it('should not register duplicate email', async () => {
      await authService.register({
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      });

      await expect(
        authService.register({
          email: 'duplicate@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'CUSTOMER',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      });
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
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

