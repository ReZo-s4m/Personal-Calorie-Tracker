import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OkResponse,
  PublicUser,
  ResetPasswordRequest,
  SignupRequest,
  VerifyOtpRequest,
} from './models/auth.models.js';

export interface IAuthLogic {
  /** Creates the account and returns it with a fresh token. Conflicts on a taken email. */
  signup(request: SignupRequest): Promise<AuthResponse>;

  /** Verifies the password and returns a fresh token. Rejects with 401 either way it fails. */
  login(request: LoginRequest): Promise<AuthResponse>;

  getProfile(userId: string): Promise<PublicUser>;

  /** Emails a 6-digit code when the account exists. Always returns { ok: true }. */
  forgotPassword(request: ForgotPasswordRequest): Promise<OkResponse>;

  /** Checks the latest unused code. Does not consume it. */
  verifyOtp(request: VerifyOtpRequest): Promise<OkResponse>;

  /** Checks the code again, writes passwordHash, then consumes the code. Does not sign in. */
  resetPassword(request: ResetPasswordRequest): Promise<OkResponse>;
}
