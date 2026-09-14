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
