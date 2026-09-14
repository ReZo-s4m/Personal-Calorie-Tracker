/** Wire in: what the signup rules produce. */
export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

/** Wire in: what the login rules produce. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Wire out: a user as the API is willing to describe them. Never carries the hash. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

/** Wire out: the body returned by signup and login. */
export interface AuthResponse {
  user: PublicUser;
  token: string;
}

/** Wire in: start a reset. Always answered the same way. */
export interface ForgotPasswordRequest {
  email: string;
}

/** Wire in: check the email OTP without consuming it. */
export interface VerifyOtpRequest {
  email: string;
  code: string;
}

/** Wire in: check the OTP again and write a new passwordHash. */
export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

/** Wire out: forgot / verify / reset succeeded. Never carries a code or token. */
export interface OkResponse {
  ok: true;
}
