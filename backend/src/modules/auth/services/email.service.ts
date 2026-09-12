import { EmailService, EmailOptions } from '../../../services/email/email.service';
import { logger } from '../../../utils/logger';

/**
 * Auth Email Service - Handles auth-specific email operations
 * Wraps the global EmailService for email verification, password reset, etc.
 */
export class AuthEmailService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send email verification token
   * @param email User email
   * @param token Verification token
   * @param frontendUrl Frontend base URL for verification link
   */
  async sendEmailVerificationToken(
    email: string,
    token: string,
    frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3001'
  ): Promise<void> {
    try {
      const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

      const options: EmailOptions = {
        to: email,
        subject: 'Verify your PackagePro email address',
        template: 'email-verification',
        templateData: {
          email,
          verificationLink,
          expiryMinutes: 24 * 60, // 24 hours
        },
      };

      await this.emailService.sendEmail(options);
      logger.info(`Email verification sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send email verification to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password reset token
   * @param email User email
   * @param token Password reset token
   * @param frontendUrl Frontend base URL for reset link
   */
  async sendPasswordResetToken(
    email: string,
    token: string,
    frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3001'
  ): Promise<void> {
    try {
      const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const options: EmailOptions = {
        to: email,
        subject: 'Reset your PackagePro password',
        template: 'password-reset',
        templateData: {
          email,
          resetLink,
          expiryMinutes: 60, // 1 hour
        },
      };

      await this.emailService.sendEmail(options);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send login notification (optional - for security alerts)
   * @param email User email
   * @param ipAddress IP address of login
   */
  async sendLoginNotification(
    email: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      // This is optional - some apps notify on new device logins
      // For now, we'll skip to avoid notification spam
      logger.info(`Login notification would be sent to ${email} from ${ipAddress}`);
    } catch (error) {
      logger.error(`Failed to send login notification to ${email}`, error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Send welcome email to new user
   * @param email User email
   * @param name User name (optional)
   * @param frontendUrl Frontend base URL
   */
  async sendWelcomeEmail(
    email: string,
    name?: string,
    frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3001'
  ): Promise<void> {
    try {
      const options: EmailOptions = {
        to: email,
        subject: 'Welcome to PackagePro!',
        template: 'welcome',
        templateData: {
          email,
          name: name || email,
          frontendUrl,
        },
      };

      await this.emailService.sendEmail(options);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send email verification resend
   * (Same as sendEmailVerificationToken but tracks resend)
   * @param email User email
   * @param token Verification token
   * @param frontendUrl Frontend base URL
   */
  async sendEmailVerificationResend(
    email: string,
    token: string,
    frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3001'
  ): Promise<void> {
    try {
      const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

      const options: EmailOptions = {
        to: email,
        subject: 'Verify your PackagePro email address',
        template: 'email-verification-resend',
        templateData: {
          email,
          verificationLink,
          expiryMinutes: 24 * 60,
          isResend: true,
        },
      };

      await this.emailService.sendEmail(options);
      logger.info(`Email verification resent to ${email}`);
    } catch (error) {
      logger.error(`Failed to resend email verification to ${email}`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const authEmailService = new AuthEmailService();
