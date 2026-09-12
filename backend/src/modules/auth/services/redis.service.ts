import { getRedisClient, isRedisEnabled } from '../../../lib/redis';

/**
 * Redis key patterns for auth operations
 */
const KEY_PATTERNS = {
  // Login attempt tracking: failed_login:{email}:{ip}
  failedLogin: (email: string, ip: string) => `failed_login:${email}:${ip}`,
  
  // CAPTCHA required flag: failed_login_cap:{email}:{ip}
  captchaRequired: (email: string, ip: string) => `failed_login_cap:${email}:${ip}`,
  
  // Refresh token blacklist: blacklist:refreshToken:{jti}
  refreshTokenBlacklist: (jti: string) => `blacklist:refreshToken:${jti}`,
  
  // Email verification attempt rate limit: verification_attempts:{email}
  verificationAttempts: (email: string) => `verification_attempts:${email}`,
  
  // Password reset attempt rate limit: password_reset_attempt:{email}
  passwordResetAttempts: (email: string) => `password_reset_attempt:${email}`,
};

/**
 * Auth Redis Service - Manages temporary auth state in Redis
 * Used for: login attempts, token blacklist, rate limiting
 */
export class AuthRedisService {
  /**
   * Record a failed login attempt
   * @param email User email
   * @param ip Client IP address
   * @param windowMs Sliding window in milliseconds
   * @returns Updated attempt count
   */
  async recordFailedLoginAttempt(
    email: string,
    ip: string,
    windowMs: number = 3600000 // 1 hour default
  ): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 1; // Fallback: treat as single attempt
    }

    const key = KEY_PATTERNS.failedLogin(email, ip);
    const expirySeconds = Math.ceil(windowMs / 1000);

    // Increment and set expiry
    const attempts = await redis.incr(key);
    await redis.expire(key, expirySeconds);

    return attempts;
  }

  /**
   * Get current failed login attempt count
   * @param email User email
   * @param ip Client IP address
   * @returns Current attempt count (0 if not tracking)
   */
  async getFailedLoginAttempts(email: string, ip: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 0; // Fallback: no attempts
    }

    const key = KEY_PATTERNS.failedLogin(email, ip);
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Clear failed login attempts for a user+ip
   * @param email User email
   * @param ip Client IP address
   */
  async clearFailedLoginAttempts(email: string, ip: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.failedLogin(email, ip);
    await redis.del(key);
  }

  /**
   * Mark that CAPTCHA is required for this email+ip
   * @param email User email
   * @param ip Client IP address
   * @param durationMs How long to require CAPTCHA (milliseconds)
   */
  async requireCaptcha(
    email: string,
    ip: string,
    durationMs: number = 86400000 // 24 hours default
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.captchaRequired(email, ip);
    const expirySeconds = Math.ceil(durationMs / 1000);
    await redis.setex(key, expirySeconds, '1');
  }

  /**
   * Check if CAPTCHA is required for this email+ip
   * @param email User email
   * @param ip Client IP address
   * @returns true if CAPTCHA required
   */
  async isCaptchaRequired(email: string, ip: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return false; // Fallback: no CAPTCHA required
    }

    const key = KEY_PATTERNS.captchaRequired(email, ip);
    const required = await redis.exists(key);
    return required === 1;
  }

  /**
   * Clear CAPTCHA requirement for this email+ip
   * @param email User email
   * @param ip Client IP address
   */
  async clearCaptchaRequirement(email: string, ip: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.captchaRequired(email, ip);
    await redis.del(key);
  }

  /**
   * Add a refresh token JTI to the blacklist (for logout)
   * @param jti JWT ID (from token)
   * @param expiresInSeconds Token expiry time in seconds (we blacklist until expiry)
   */
  async blacklistRefreshToken(jti: string, expiresInSeconds: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.refreshTokenBlacklist(jti);
    await redis.setex(key, expiresInSeconds, '1');
  }

  /**
   * Check if a refresh token JTI is blacklisted
   * @param jti JWT ID (from token)
   * @returns true if blacklisted (i.e., logged out)
   */
  async isRefreshTokenBlacklisted(jti: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return false; // Fallback: allow token
    }

    const key = KEY_PATTERNS.refreshTokenBlacklist(jti);
    const isBlacklisted = await redis.exists(key);
    return isBlacklisted === 1;
  }

  /**
   * Record an email verification attempt (for rate limiting)
   * @param email User email
   * @param windowMs Sliding window in milliseconds
   * @param maxAttempts Max allowed attempts in window
   * @returns { attempts: number, allowedUntil?: Date } - attempts count and when next attempt allowed
   */
  async recordEmailVerificationAttempt(
    email: string,
    windowMs: number = 3600000 // 1 hour
  ): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 1; // Fallback
    }

    const key = KEY_PATTERNS.verificationAttempts(email);
    const expirySeconds = Math.ceil(windowMs / 1000);

    const attempts = await redis.incr(key);
    await redis.expire(key, expirySeconds);

    return attempts;
  }

  /**
   * Get email verification attempts
   * @param email User email
   * @returns Current attempt count
   */
  async getEmailVerificationAttempts(email: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 0;
    }

    const key = KEY_PATTERNS.verificationAttempts(email);
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Clear email verification attempts
   * @param email User email
   */
  async clearEmailVerificationAttempts(email: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.verificationAttempts(email);
    await redis.del(key);
  }

  /**
   * Record a password reset attempt (for rate limiting)
   * @param email User email
   * @param windowMs Sliding window in milliseconds
   * @returns Attempt count
   */
  async recordPasswordResetAttempt(
    email: string,
    windowMs: number = 3600000 // 1 hour
  ): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 1; // Fallback
    }

    const key = KEY_PATTERNS.passwordResetAttempts(email);
    const expirySeconds = Math.ceil(windowMs / 1000);

    const attempts = await redis.incr(key);
    await redis.expire(key, expirySeconds);

    return attempts;
  }

  /**
   * Get password reset attempts
   * @param email User email
   * @returns Current attempt count
   */
  async getPasswordResetAttempts(email: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return 0;
    }

    const key = KEY_PATTERNS.passwordResetAttempts(email);
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Clear password reset attempts
   * @param email User email
   */
  async clearPasswordResetAttempts(email: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisEnabled()) {
      return;
    }

    const key = KEY_PATTERNS.passwordResetAttempts(email);
    await redis.del(key);
  }
}

// Export singleton instance
export const authRedisService = new AuthRedisService();
