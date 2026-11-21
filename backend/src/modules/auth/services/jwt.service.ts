import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWTPayload } from '../types/auth.types';

/**
 * JWT Service - Handles token generation and verification
 * Implements stateless access tokens + Redis blacklist for refresh tokens
 */
export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    // SEC: never fall back to hardcoded secrets outside development/test.
    // A default secret lets anyone who can read the repo mint valid tokens.
    if (process.env.NODE_ENV === 'production' && (!accessSecret || !refreshSecret)) {
      throw new Error(
        'JWT_SECRET and JWT_REFRESH_SECRET must be set in production. Refusing to start.'
      );
    }

    this.accessTokenSecret = accessSecret || 'dev-secret-change-in-prod';
    this.refreshTokenSecret = refreshSecret || 'dev-refresh-secret-change-in-prod';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!accessSecret || !refreshSecret) {
      console.warn('⚠️  JWT secrets not configured. Using development defaults (never do this in production)');
    }
  }

  /**
   * Generate an access token (stateless, short-lived)
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @returns Encoded JWT access token
   */
  generateAccessToken(userId: string, email: string, role: string): string {
    const jti = uuidv4(); // JWT ID for potential future blacklisting

    const payload: JWTPayload = {
      userId,
      email,
      role: role as any, // Role is validated at DB level
      jti,
      type: 'access',
    };

    const options: SignOptions = {
      expiresIn: this.accessTokenExpiry as any,
      issuer: 'packagepro-auth',
      audience: 'packagepro-api',
      subject: userId,
    };

    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  /**
   * Generate a refresh token (can be blacklisted, longer-lived)
   * @param userId User ID
   * @param email User email
   * @param role User role
   * @returns Encoded JWT refresh token
   */
  generateRefreshToken(userId: string, email: string, role: string): string {
    const jti = uuidv4(); // JWT ID for blacklist tracking

    const payload: JWTPayload = {
      userId,
      email,
      role: role as any,
      jti, // CRITICAL: Refresh tokens tracked by JTI for revocation
      type: 'refresh',
    };

    const options: SignOptions = {
      expiresIn: this.refreshTokenExpiry as any,
      issuer: 'packagepro-auth',
      audience: 'packagepro-api',
      subject: userId,
    };

    return jwt.sign(payload, this.refreshTokenSecret, options);
  }

  /**
   * Verify an access token and extract payload
   * @param token JWT access token
   * @returns Decoded JWT payload if valid
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const options: VerifyOptions = {
        issuer: 'packagepro-auth',
        audience: 'packagepro-api',
      };

      const decoded = jwt.verify(token, this.accessTokenSecret, options);
      return decoded as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('ACCESS_TOKEN_INVALID');
      }
      throw error;
    }
  }

  /**
   * Verify a refresh token and extract payload
   * @param token JWT refresh token
   * @returns Decoded JWT payload if valid
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const options: VerifyOptions = {
        issuer: 'packagepro-auth',
        audience: 'packagepro-api',
      };

      const decoded = jwt.verify(token, this.refreshTokenSecret, options);
      return decoded as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('REFRESH_TOKEN_INVALID');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging/unsafe contexts only)
   * @param token JWT token
   * @returns Decoded JWT payload or null
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Extract expiry time in seconds from a token
   * @param token JWT token
   * @returns Seconds until expiry (0 if already expired)
   */
  getTokenExpiryInSeconds(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const expirySeconds = decoded.exp - Math.floor(Date.now() / 1000);
    return Math.max(0, expirySeconds);
  }

  /**
   * Extract JTI (JWT ID) from a token
   * Used for tracking refresh token revocation
   * @param token JWT token
   * @returns JWT ID or null
   */
  getTokenJTI(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.jti || null;
  }
}

// Export singleton instance
export const jwtService = new JWTService();
