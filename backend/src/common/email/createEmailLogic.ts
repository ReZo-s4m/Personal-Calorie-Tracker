import type { SmtpConfig } from '../../config/index.js';
import { ConsoleEmailLogic } from './ConsoleEmailLogic.js';
import type { IEmailLogic } from './IEmailLogic.js';
import { SmtpEmailLogic } from './SmtpEmailLogic.js';

class FanoutEmailLogic implements IEmailLogic {
  constructor(private readonly delegates: readonly IEmailLogic[]) {}

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    for (const delegate of this.delegates) {
      await delegate.sendPasswordResetCode(email, code);
    }
  }
}

/** Console when SMTP is unset. SMTP in production. Both in local so the log still has the code. */
export function createEmailLogic(options: {
  isProduction: boolean;
  smtp: SmtpConfig;
}): IEmailLogic {
  if (!options.smtp.isConfigured) {
    return new ConsoleEmailLogic();
  }

  const smtp = new SmtpEmailLogic(options.smtp);

  if (options.isProduction) {
    return smtp;
  }

  return new FanoutEmailLogic([new ConsoleEmailLogic(), smtp]);
}
