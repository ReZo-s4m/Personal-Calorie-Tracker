import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../errors.js';
import { SmtpEmailLogic, type SendMail } from './SmtpEmailLogic.js';

const smtp = {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'nutriai@example.com',
  pass: 'app-password',
  from: 'NutriAI <nutriai@example.com>',
  isConfigured: true,
} as const;

describe('SmtpEmailLogic', () => {
  it('puts the 6-digit code in the mail body', async () => {
    const sent: Parameters<SendMail>[0][] = [];
    const mailer = new SmtpEmailLogic(smtp, async (mail) => {
      sent.push(mail);
    });

    await mailer.sendPasswordResetCode('sam@gmail.com', '482193');

    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, 'sam@gmail.com');
    assert.equal(sent[0]?.from, 'NutriAI <nutriai@example.com>');
    assert.match(sent[0]?.text ?? '', /482193/);
  });

  it('maps a transport failure to 503 without leaking the SMTP error', async () => {
    const mailer = new SmtpEmailLogic(smtp, async () => {
      throw new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
    });

    await assert.rejects(
      () => mailer.sendPasswordResetCode('sam@gmail.com', '482193'),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 503 &&
        error.message === 'We could not send the reset code. Please try again in a moment.',
    );
  });
});
