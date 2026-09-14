export interface IEmailLogic {
  sendPasswordResetCode(email: string, code: string): Promise<void>;
}
