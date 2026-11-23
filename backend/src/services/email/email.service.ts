import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { logger } from '../../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configure email transporter
const createTransporter = () => {
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid';

  if (provider === 'test') {
    // Test-only containment: nodemailer's JSON transport renders the message
    // in-process and never opens a network connection, so CI/tests cannot
    // contact an external SMTP host or send real email. Fail closed: refuse
    // this transport outside NODE_ENV=test so a production config mistake is
    // a loud startup error, never a silent "email sent" that delivered nothing.
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'EMAIL_PROVIDER=test is only allowed with NODE_ENV=test; refusing to build a non-delivering email transport'
      );
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (provider === 'sendgrid') {
    // SendGrid via SMTP
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else {
    // AWS SES
    return nodemailer.createTransport({
      host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: {
        user: process.env.AWS_SES_ACCESS_KEY_ID,
        pass: process.env.AWS_SES_SECRET_ACCESS_KEY,
      },
    });
  }
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
}

export class EmailService {
  /**
   * Load email template
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    try {
      const templatePath = join(
        __dirname,
        'templates',
        `${templateName}.hbs`
      );
      const templateContent = readFileSync(templatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    } catch (error) {
      logger.warn(`Template ${templateName} not found, using default`);
      return Handlebars.compile('<div>{{content}}</div>');
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      let html = options.html;
      let text = options.text;

      // Render template if provided
      if (options.template) {
        const template = this.loadTemplate(options.template);
        html = template(options.templateData || {});
        text = html.replace(/<[^>]*>/g, ''); // Simple HTML to text conversion
      }

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'PackagePro',
          address: process.env.EMAIL_FROM || 'noreply@packagepro.com',
        },
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
    } catch (error) {
      logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: any): Promise<void> {
    await this.sendEmail({
      to: order.customer.user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      template: 'order-confirmation',
      templateData: { order },
    });
  }

  /**
   * Send approval request email
   */
  async sendApprovalRequest(order: any, approvalUrl: string): Promise<void> {
    await this.sendEmail({
      to: order.customer.user.email,
      subject: `Approval Required for Order ${order.orderNumber}`,
      template: 'approval-request',
      templateData: { order, approvalUrl },
    });
  }
}

export const emailService = new EmailService();
