import type { AuthResponse, LoginRequest, PublicUser, SignupRequest } from './models/auth.models.js';

export interface IAuthLogic {
  /** Creates the account and returns it with a fresh token. Conflicts on a taken email. */
  signup(request: SignupRequest): Promise<AuthResponse>;

  /** Verifies the password and returns a fresh token. Rejects with 401 either way it fails. */
  login(request: LoginRequest): Promise<AuthResponse>;

  getProfile(userId: string): Promise<PublicUser>;
}
