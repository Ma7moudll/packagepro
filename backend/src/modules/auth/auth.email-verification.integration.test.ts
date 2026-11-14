// SEC-02 — Email verification enforcement matrix.
//
//   A  unverified + correct password → login throws EMAIL_NOT_VERIFIED;
//      controller surfaces it as 403.
//   B  verified login is unchanged (tokens + success message).
//   C  refresh re-reads the DB: an unverified account cannot renew a session
//      even with a refresh token minted before enforcement shipped; the SAME
//      token refreshes fine once the DB says verified.
//   D  a correct-password-unverified attempt does NOT increment the
//      failed-attempt counter (wrong password still does — semantics kept).
//   E  a successful password reset on an unverified account marks it verified
//      atomically with the password change; the token stays single-use.
//
// Email is mocked (same determinism pattern as the other auth suites — no
// test here asserts on mail content). Marker-scoped cleanup: users cascade
// customer/vendor/tokens/auditLogs; Redis counters are cleared for the
// dedicated test IP.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { authService } from './auth.service';
import { authController } from './auth.controller';
import { jwtService } from './services/jwt.service';
import { authRedisService } from './services/redis.service';

vi.mock('../../services/email/email.service', () => ({
  // AuthEmailService constructs this class at import time — the mock must
  // export the class, not just the singleton.
  EmailService: class {
    async sendEmail() {}
  },
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

function mockRequest(payload: { body?: unknown }): FastifyRequest {
  // headers must exist: getClientInfo reads x-forwarded-for/user-agent.
  return { body: payload.body, headers: {} } as unknown as FastifyRequest;
}

/** Reply capture: records status/send so controller error paths are assertable. */
function captureReply(): FastifyReply & { statusCode: number; payload: any } {
  const reply: any = {
    statusCode: 0,
    payload: undefined,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body?: unknown) {
      reply.payload = body;
      return reply;
    },
  };
  return reply as FastifyReply & { statusCode: number; payload: any };
}

describe('SEC-02 email verification enforcement', () => {
  const marker = `sec02-${Date.now().toString(36)}`;
  const emails: string[] = [];
  let seq = 0;

  const nextEmail = (label: string) => {
    const email = `${marker}-${label}-${++seq}@test.local`;
    emails.push(email);
    return email;
  };

  const PASSWORD = 'SecurePassword123!';
  const TEST_IP = '10.255.0.7'; // dedicated to this suite — no other suite touches it

  const createDbUser = async (email: string, emailVerified: boolean) => {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    return prisma.user.create({
      data: { email, passwordHash, role: 'CUSTOMER', emailVerified },
    });
  };

  beforeAll(async () => {
    // Belt-and-braces for reruns after an aborted run (marker includes
    // Date.now, so cross-run collisions are effectively impossible).
    await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
  });

  afterAll(async () => {
    // Token tables carry no FK cascade — clean them explicitly (all tokens
    // this suite creates use the sec02- prefix).
    await prisma.emailVerificationToken.deleteMany({
      where: { token: { startsWith: 'sec02-' } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { token: { startsWith: 'sec02-' } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await Promise.all(
      emails.map((email) =>
        authRedisService
          .clearFailedLoginAttempts(email, TEST_IP)
          .catch(() => undefined)
      )
    );
  });

  it('A: unverified login with correct password → EMAIL_NOT_VERIFIED, 403 via controller', async () => {
    const email = nextEmail('unverified-login');
    await createDbUser(email, false);

    await expect(
      authService.login({ email, password: PASSWORD })
    ).rejects.toThrow('EMAIL_NOT_VERIFIED');

    const reply = captureReply();
    await authController.login(
      mockRequest({ body: { email, password: PASSWORD } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.payload?.success).toBe(false);
    expect(reply.payload?.error).toBe('EMAIL_NOT_VERIFIED');
  });

  it('B: verified login is unchanged — tokens + success message', async () => {
    const email = nextEmail('verified-login');
    await createDbUser(email, true);

    const result = await authService.login({ email, password: PASSWORD });

    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.message).toBe('Login successful');
    expect(result.user.email).toBe(email);
  });

  it('C: refresh reads the DB — unverified cannot renew, verified can (same token)', async () => {
    const email = nextEmail('refresh');
    const user = await createDbUser(email, false);

    // Minted directly, NOT via login: simulates a token issued before
    // enforcement shipped. JWT claims carry no verification state, so the
    // rejection must come from the database check.
    const refreshToken = jwtService.generateRefreshToken(
      user.id,
      user.email,
      user.role
    );

    await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow(
      'EMAIL_NOT_VERIFIED'
    );

    // Flip the DB flag — the SAME pre-enforcement token must now work,
    // proving the decision came from current user state, not the JWT.
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    const result = await authService.refreshAccessToken(refreshToken);
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('D: correct-password-unverified attempt does not count as a failed login', async () => {
    const email = nextEmail('counter');
    await createDbUser(email, false);

    // Vitest has no live Redis (same constraint as auth.login.test.ts), so
    // pin the contract at the service boundary with spies: the wrong-password
    // path records a failed attempt; the correct-password-unverified path
    // must neither record, nor clear the counter, nor arm CAPTCHA.
    const recordSpy = vi.spyOn(authRedisService, 'recordFailedLoginAttempt');
    const captchaSpy = vi.spyOn(authRedisService, 'requireCaptcha');
    const clearSpy = vi.spyOn(authRedisService, 'clearFailedLoginAttempts');

    try {
      // Baseline: a WRONG password is recorded as a failed attempt
      // (unchanged semantics).
      await expect(
        authService.login({ email, password: 'definitely-wrong' }, TEST_IP)
      ).rejects.toThrow('INVALID_CREDENTIALS');
      expect(recordSpy).toHaveBeenCalledTimes(1);

      // Correct password but unverified: audited + rejected — no failure
      // record (not incremented), no counter clear, no CAPTCHA arming.
      await expect(
        authService.login({ email, password: PASSWORD }, TEST_IP)
      ).rejects.toThrow('EMAIL_NOT_VERIFIED');
      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(clearSpy).not.toHaveBeenCalled();
      expect(captchaSpy).not.toHaveBeenCalled();
    } finally {
      recordSpy.mockRestore();
      captchaSpy.mockRestore();
      clearSpy.mockRestore();
    }
  });

  it('E: password reset verifies the email; password + flag + token in one transaction; single-use kept', async () => {
    const email = nextEmail('reset-verify');
    const user = await createDbUser(email, false);

    const resetToken = `sec02-reset-${user.id}`;
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPassword = 'BrandNewPassword123!';
    const result = await authService.resetPassword({
      token: resetToken,
      newPassword,
    });
    expect(result.message).toContain('Password reset successful');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare(newPassword, after!.passwordHash)).toBe(true);
    expect(await bcrypt.compare(PASSWORD, after!.passwordHash)).toBe(false);
    // Reset proves mailbox control → email verified (approved SEC-02 policy).
    expect(after!.emailVerified).toBe(true);

    // Single-use consumption survived the atomic update.
    await expect(
      authService.resetPassword({ token: resetToken, newPassword })
    ).rejects.toThrow('PASSWORD_RESET_TOKEN_INVALID');
  });

  // ---- Concurrency regression (SEC-02 review): exactly ONE claimant ----

  it('R1: two concurrent resetPassword calls share one token — exactly one wins, DB consistent, reuse rejected', async () => {
    const email = nextEmail('race-reset');
    const user = await createDbUser(email, false);

    const raceToken = `sec02-race-reset-${user.id}`;
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: raceToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const pwA = 'RaceWinnerA123!';
    const pwB = 'RaceWinnerB123!';

    const results = await Promise.allSettled([
      authService.resetPassword({ token: raceToken, newPassword: pwA }),
      authService.resetPassword({ token: raceToken, newPassword: pwB }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // The loser is the single-use rejection, not something incidental.
    const loser = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(loser.message).toBe('PASSWORD_RESET_TOKEN_INVALID');

    // DB state consistent: the stored password equals exactly ONE of the two
    // submitted values (the winner's) — never an ambiguous overwrite, the
    // flag flipped, and the token consumed exactly once.
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    const matchesA = await bcrypt.compare(pwA, after!.passwordHash);
    const matchesB = await bcrypt.compare(pwB, after!.passwordHash);
    expect([matchesA, matchesB].filter(Boolean)).toHaveLength(1);
    expect(after!.emailVerified).toBe(true);

    const tokenRow = await prisma.passwordResetToken.findUnique({
      where: { token: raceToken },
    });
    expect(tokenRow?.usedAt).toBeTruthy();

    // Subsequent reuse of the token is rejected.
    await expect(
      authService.resetPassword({ token: raceToken, newPassword: pwA })
    ).rejects.toThrow('PASSWORD_RESET_TOKEN_INVALID');
  });

  it('R2: two concurrent verifyEmail calls share one token — exactly one wins, reuse rejected', async () => {
    const email = nextEmail('race-verify');
    const user = await createDbUser(email, false);

    const raceToken = `sec02-race-verify-${user.id}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: raceToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const results = await Promise.allSettled([
      authService.verifyEmail({ token: raceToken }),
      authService.verifyEmail({ token: raceToken }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const loser = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(loser.message).toBe('VERIFICATION_TOKEN_INVALID');

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.emailVerified).toBe(true);

    const tokenRow = await prisma.emailVerificationToken.findUnique({
      where: { token: raceToken },
    });
    expect(tokenRow?.usedAt).toBeTruthy();

    // Subsequent reuse of the token is rejected.
    await expect(
      authService.verifyEmail({ token: raceToken })
    ).rejects.toThrow('VERIFICATION_TOKEN_INVALID');
  });
});
