import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nodemailer from 'nodemailer';

/** Exercise the actual in-process JSON transport. Spies observe rather than
 * replace transport creation or sending; no SMTP transport is selected. */
describe('email transport containment (EMAIL_PROVIDER=test)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('EMAIL_PROVIDER', 'test');
    vi.stubEnv('NODE_ENV', 'test');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('sends through the real JSON transport without an SMTP configuration', async () => {
    const create = vi.spyOn(nodemailer, 'createTransport');
    const { EmailService } = await import('./email.service');
    expect(create).toHaveBeenCalledWith({ jsonTransport: true });
    const transport = create.mock.results[0].value;
    const send = vi.spyOn(transport, 'sendMail');
    await expect(new EmailService().sendEmail({
      to: 'ci-containment@example.com', subject: 'containment check',
      html: '<p>In-process containment marker</p>',
    })).resolves.toBeUndefined();
    const result = await send.mock.results[0].value;
    expect(typeof result.message).toBe('string');
    expect(JSON.parse(result.message).html).toContain('In-process containment marker');
  });

  it('renders an existing template through the contained transport', async () => {
    const create = vi.spyOn(nodemailer, 'createTransport');
    const { EmailService } = await import('./email.service');
    expect(create).toHaveBeenCalledWith({ jsonTransport: true });
    const transport = create.mock.results[0].value;
    const send = vi.spyOn(transport, 'sendMail');
    await expect(new EmailService().sendEmail({
      to: 'ci-containment@example.com', subject: 'template containment',
      template: 'approval-request',
      templateData: { order: { orderNumber: 'CI-CONTAINED' }, approvalUrl: 'http://localhost:3001/approve/ci-only' },
    })).resolves.toBeUndefined();
    const result = await send.mock.results[0].value;
    const message = JSON.parse(result.message);
    expect(message.html).toContain('Design Approval Required');
    expect(message.html).toContain('CI-CONTAINED');
    expect(message.html).toContain('http://localhost:3001/approve/ci-only');
  });
});
