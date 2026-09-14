import nodemailer from 'nodemailer';
import { serviceUnavailable } from '../errors.js';
import type { SmtpConfig } from '../../config/index.js';
import type { IEmailLogic } from './IEmailLogic.js';

export type SendMail = (mail: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) => Promise<unknown>;

/** Sends the 6-digit reset code through SMTP (Gmail, Resend SMTP, Mailtrap, …). */
export class SmtpEmailLogic implements IEmailLogic {
  private readonly from: string;
  private readonly sendMail: SendMail;

  constructor(smtp: SmtpConfig, sendMail?: SendMail) {
    this.from = smtp.from;

    if (sendMail) {
      this.sendMail = sendMail;
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    this.sendMail = (mail) => transporter.sendMail(mail);
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    try {
      await this.sendMail({
        from: this.from,
        to: email,
        subject: 'Your NutriAI password reset code',
        text: [
          `Your NutriAI password reset code is ${code}.`,
          'It expires in 10 minutes.',
          'If you did not ask to reset your password, you can ignore this email.',
        ].join('\n'),
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw serviceUnavailable('We could not send the reset code. Please try again in a moment.');
    }
  }
}
