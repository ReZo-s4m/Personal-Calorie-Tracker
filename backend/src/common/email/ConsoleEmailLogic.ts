import type { IEmailLogic } from './IEmailLogic.js';

/** Development mailer: the code goes to the server log, not an inbox. */
export class ConsoleEmailLogic implements IEmailLogic {
  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    console.log(`Password reset code for ${email}: ${code}`);
  }
}
