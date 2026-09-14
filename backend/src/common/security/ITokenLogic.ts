export interface TokenPayload {
  userId: string;
  email: string;
}

/** Issues and verifies the bearer tokens the API authenticates with. */
export interface ITokenLogic {
  sign(payload: TokenPayload): string;

  /** Throws an AppError(401) when the token is missing, expired or malformed. */
  verify(token: string): TokenPayload;
}
